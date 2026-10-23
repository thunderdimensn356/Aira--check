package com.aira.app;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;

/**
 * Aira ↔ Termux bridge via RUN_COMMAND + output file on shared storage.
 */
public class TermuxBridge {
    private static final String TAG = "TermuxBridge";
    private static final String TERMUX_PKG = "com.termux";
    private static final String RUN_SERVICE = "com.termux.app.RunCommandService";
    private static final String ACTION = "com.termux.RUN_COMMAND";

    private static final String SANDBOX = "/sdcard/AiraSandbox";
    private static final String OUT_FILE = SANDBOX + "/out.txt";
    private static final String RUN_SCRIPT = SANDBOX + "/run.sh";

    private final Context context;
    private final WebView webView;

    public TermuxBridge(Context context, WebView webView) {
        this.context = context.getApplicationContext();
        this.webView = webView;
    }

    @JavascriptInterface
    public String runCommand(String command) {
        if (command == null || command.trim().isEmpty()) {
            return "{\"ok\":false,\"error\":\"empty command\"}";
        }

        try {
            File dir = new File(SANDBOX);
            if (!dir.exists() && !dir.mkdirs()) {
                return "{\"ok\":false,\"error\":\"cannot create AiraSandbox\"}";
            }

            // clear previous output
            writeFile(OUT_FILE, "");

            // script: run cmd, capture stdout+stderr
            String script =
                "#!/data/data/com.termux/files/usr/bin/bash\n" +
                "cd \~\n" +
                command.replace("\"", "\\\"") + " > \"" + OUT_FILE + "\" 2>&1\n" +
                "echo \"__AIRA_EXIT__:$?\" >> \"" + OUT_FILE + "\"\n";

            writeFile(RUN_SCRIPT, script);

            Intent intent = new Intent();
            intent.setClassName(TERMUX_PKG, RUN_SERVICE);
            intent.setAction(ACTION);
            intent.putExtra(
                "com.termux.RUN_COMMAND_PATH",
                "/data/data/com.termux/files/usr/bin/bash"
            );
            intent.putExtra(
                "com.termux.RUN_COMMAND_ARGUMENTS",
                new String[] { RUN_SCRIPT }
            );
            intent.putExtra(
                "com.termux.RUN_COMMAND_WORKDIR",
                "/data/data/com.termux/files/home"
            );
            intent.putExtra("com.termux.RUN_COMMAND_BACKGROUND", true);
            intent.putExtra("com.termux.RUN_COMMAND_SESSION_ACTION", "0");

            context.startService(intent);
            return "{\"ok\":true,\"status\":\"started\"}";
        } catch (Exception e) {
            Log.e(TAG, "runCommand failed", e);
            return "{\"ok\":false,\"error\":\"" + escape(e.getMessage()) + "\"}";
        }
    }

    @JavascriptInterface
    public String readOutput() {
        try {
            File f = new File(OUT_FILE);
            if (!f.exists()) {
                return "{\"ok\":true,\"ready\":false,\"output\":\"\"}";
            }
            String content = readFile(OUT_FILE);
            boolean ready = content.contains("__AIRA_EXIT__:");
            return "{\"ok\":true,\"ready\":" + ready +
                ",\"output\":\"" + escape(content) + "\"}";
        } catch (Exception e) {
            return "{\"ok\":false,\"error\":\"" + escape(e.getMessage()) + "\"}";
        }
    }

    private static void writeFile(String path, String data) throws Exception {
        FileWriter fw = new FileWriter(path, false);
        fw.write(data);
        fw.close();
    }

    private static String readFile(String path) throws Exception {
        StringBuilder sb = new StringBuilder();
        BufferedReader br = new BufferedReader(new FileReader(path));
        String line;
        while ((line = br.readLine()) != null) {
            sb.append(line).append("\n");
        }
        br.close();
        return sb.toString();
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r");
    }
}
