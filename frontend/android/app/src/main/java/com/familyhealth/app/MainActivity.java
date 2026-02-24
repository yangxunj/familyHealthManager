package com.familyhealth.app;

import android.os.Bundle;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            private long lastBackPressTime = 0;

            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                String url = webView != null ? webView.getUrl() : null;

                if (isMainRoute(url) || webView == null || !webView.canGoBack()) {
                    long now = System.currentTimeMillis();
                    if (now - lastBackPressTime < 2000) {
                        moveTaskToBack(true);
                    } else {
                        lastBackPressTime = now;
                        Toast.makeText(MainActivity.this, "再按一次返回键退出应用", Toast.LENGTH_SHORT).show();
                    }
                } else {
                    webView.goBack();
                }
            }
        });
    }

    private boolean isMainRoute(String url) {
        if (url == null) return true;
        try {
            String path = java.net.URI.create(url).getPath();
            if (path == null || path.isEmpty() || path.equals("/")) return true;
            String[] mainPaths = {
                "/dashboard", "/members", "/documents", "/records",
                "/advice", "/chat", "/food-query", "/health-plan",
                "/family", "/settings", "/login"
            };
            for (String main : mainPaths) {
                if (path.equals(main)) return true;
            }
            return false;
        } catch (Exception e) {
            return true;
        }
    }
}
