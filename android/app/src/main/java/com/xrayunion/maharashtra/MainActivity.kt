package com.xrayunion.maharashtra

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONObject
import androidx.activity.ComponentActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import android.content.pm.PackageManager
import android.webkit.WebSettings
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private val homeUrl = "https://xrayunionmah.web.app/"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestNotificationPermission()
        createNotificationChannel()
        webView = WebView(this)
        setContentView(webView)
        // Strongest mobile protection: keep the entire association app non-capturable.
        window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
        configureWebView()
        registerNativePushToken()
        handleIntent(intent)
    }

    private fun configureWebView() {
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = false
        webView.settings.allowContentAccess = false
        webView.settings.mediaPlaybackRequiresUserGesture = true
        webView.settings.setSupportMultipleWindows(false)
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                val css = """
                    body{background:#f1f5f9!important;}
                    .top-bar,.url-share-banner{display:none!important;}
                    button,.btn,.btn-action{border-radius:14px!important;}
                    .card,.stat-card,.profile-card,.section-card{border-radius:20px!important;box-shadow:0 8px 24px rgba(15,44,89,.10)!important;}
                    input,select,textarea{border-radius:12px!important;}
                    header,.navbar,.app-header{box-shadow:0 6px 20px rgba(0,0,0,.12)!important;}
                """.trimIndent()
                val js = "(function(){var s=document.getElementById('androidAppPolish');if(!s){s=document.createElement('style');s.id='androidAppPolish';s.innerHTML=" + JSONObject.quote(css) + ";document.head.appendChild(s);}})();"
                view.evaluateJavascript(js, null)
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val u = request.url.toString()
                return if (u.startsWith("https://xrayunionmah.web.app/")) {
                    false
                } else {
                    startActivity(Intent(Intent.ACTION_VIEW, request.url))
                    true
                }
            }
        }
        webView.webChromeClient = WebChromeClient()
        webView.settings.cacheMode = WebSettings.LOAD_DEFAULT
        webView.settings.builtInZoomControls = false
        webView.settings.displayZoomControls = false
        webView.settings.userAgentString = webView.settings.userAgentString + " XRayUnionAndroidApp/2.0"
        webView.setDownloadListener { url, _, _, _, _ ->
            try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (_: Exception) {}
        }
    }

    private fun registerNativePushToken() {
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            if (token.isNullOrBlank()) return@addOnSuccessListener
            FirebaseFirestore.getInstance().collection("fcm_tokens").document(token)
                .set(mapOf("token" to token, "platform" to "android", "updatedAt" to System.currentTimeMillis()))
        }
    }

    private fun handleIntent(intent: Intent?) {
        val target = intent?.getStringExtra("deep_link")
            ?: intent?.data?.toString()
            ?: homeUrl
        if (target.startsWith("https://xrayunionmah.web.app/")) webView.loadUrl(target) else webView.loadUrl(homeUrl)
    }

    fun setSecureViewer(enabled: Boolean) {
        if (enabled) window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
        else window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            val channel = NotificationChannel("circulars", "Circulars & GR", NotificationManager.IMPORTANCE_HIGH)
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
}
