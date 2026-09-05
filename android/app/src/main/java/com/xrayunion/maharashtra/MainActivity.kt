package com.xrayunion.maharashtra

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import android.content.pm.PackageManager
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private lateinit var loadingOverlay: View
    private val homeUrl = "https://xrayunionmah.web.app/"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(7, 39, 94)
        window.navigationBarColor = Color.rgb(7, 25, 56)
        requestNotificationPermission()
        createNotificationChannel()
        buildAppShell()
        configureWebView()
        registerNativePushToken()
        handleIntent(intent)
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else finish()
            }
        })
    }

    private fun buildAppShell() {
        val root = FrameLayout(this)
        webView = WebView(this)
        root.addView(webView, FrameLayout.LayoutParams(-1, -1))

        val overlay = FrameLayout(this)
        overlay.setBackgroundColor(Color.WHITE)
        val box = FrameLayout(this)
        val logo = ImageView(this).apply { setImageResource(com.xrayunion.maharashtra.R.mipmap.ic_launcher); adjustViewBounds = true }
        val title = TextView(this).apply {
            text = "X-Ray Union"
            textSize = 22f
            setTextColor(Color.rgb(7, 39, 94))
            gravity = Gravity.CENTER
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        }
        val sub = TextView(this).apply {
            text = "क्ष-किरण वैज्ञानिक अधिकारी (गट-क) कर्मचारी संघटना"
            textSize = 14f
            setTextColor(Color.DKGRAY)
            gravity = Gravity.CENTER
            setPadding(18, 6, 18, 6)
        }
        val progress = ProgressBar(this).apply { isIndeterminate = true }
        val lpLogo = FrameLayout.LayoutParams(150,150,Gravity.CENTER_HORIZONTAL); lpLogo.topMargin=70
        val lpTitle = FrameLayout.LayoutParams(-1,60); lpTitle.topMargin=230
        val lpSub = FrameLayout.LayoutParams(-1,70); lpSub.topMargin=285
        val lpProgress = FrameLayout.LayoutParams(52,52,Gravity.CENTER_HORIZONTAL); lpProgress.topMargin=365
        box.addView(logo,lpLogo); box.addView(title,lpTitle); box.addView(sub,lpSub); box.addView(progress,lpProgress)
        overlay.addView(box,FrameLayout.LayoutParams(-1,470,Gravity.CENTER))
        root.addView(overlay,FrameLayout.LayoutParams(-1,-1))
        loadingOverlay=overlay
        setContentView(root)
        window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
    }

    private fun configureWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = false
        settings.allowContentAccess = false
        settings.mediaPlaybackRequiresUserGesture = true
        settings.setSupportMultipleWindows(false)
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        settings.userAgentString = settings.userAgentString + " XRayUnionAndroidApp/2.1"

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view,url,favicon)
                loadingOverlay.visibility = View.VISIBLE
            }
            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view,url)
                loadingOverlay.postDelayed({ loadingOverlay.visibility = View.GONE }, 180)
                val css = """
                    :root{--app-blue:#0b3d91;--app-dark:#071938;}
                    *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}
                    html,body{width:100%;min-height:100%;margin:0;padding:0;overflow-x:hidden;}
                    body{background:#f5f7fb!important;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif!important;}
                    img{max-width:100%;height:auto;}
                    header,.navbar,.app-header{position:sticky;top:0;z-index:1000;box-shadow:0 5px 18px rgba(0,0,0,.10)!important;}
                    button,.btn,.btn-action,input[type=button],input[type=submit]{min-height:44px;border-radius:14px!important;}
                    input,select,textarea{min-height:44px;border-radius:12px!important;font-size:16px!important;}
                    .card,.stat-card,.profile-card,.section-card,.dashboard-card{border-radius:20px!important;box-shadow:0 7px 24px rgba(15,44,89,.09)!important;}
                    a{touch-action:manipulation;}
                    table{display:block;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;}
                    .container,.content,.main-content{width:100%!important;max-width:1100px;margin-left:auto!important;margin-right:auto!important;}
                    @media(max-width:600px){body{font-size:15px!important}.container,.content,.main-content{padding-left:12px!important;padding-right:12px!important}.grid,.cards,.dashboard-grid{grid-template-columns:1fr!important}.modal,.dialog{width:calc(100% - 20px)!important;max-width:none!important}}
                """.trimIndent()
                val js="(function(){var s=document.getElementById('androidAppPolish');if(!s){s=document.createElement('style');s.id='androidAppPolish';s.innerHTML="+org.json.JSONObject.quote(css)+";document.head.appendChild(s);}})();"
                view.evaluateJavascript(js,null)
            }
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                super.onReceivedError(view,request,error)
                if (request.isForMainFrame) {
                    loadingOverlay.visibility=View.GONE
                    Toast.makeText(this@MainActivity,"इंटरनेट कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.",Toast.LENGTH_LONG).show()
                }
            }
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val u=request.url.toString()
                return if(u.startsWith(homeUrl)) false else { try{startActivity(Intent(Intent.ACTION_VIEW,request.url))}catch(_:Exception){}; true }
            }
        }
        webView.webChromeClient=WebChromeClient()
        webView.setDownloadListener { url,_,_,_,_-> try{startActivity(Intent(Intent.ACTION_VIEW,Uri.parse(url)))}catch(_:Exception){} }
    }

    private fun registerNativePushToken(){
        FirebaseMessaging.getInstance().token.addOnSuccessListener{token->
            if(token.isNullOrBlank())return@addOnSuccessListener
            FirebaseFirestore.getInstance().collection("fcm_tokens").document(token).set(mapOf("token" to token,"platform" to "android","updatedAt" to System.currentTimeMillis()))
        }
    }
    private fun handleIntent(intent:Intent?){
        val target=intent?.getStringExtra("deep_link")?:intent?.data?.toString()?:homeUrl
        webView.loadUrl(if(target.startsWith(homeUrl))target else homeUrl)
    }
    fun setSecureViewer(enabled:Boolean){if(enabled)window.setFlags(WindowManager.LayoutParams.FLAG_SECURE,WindowManager.LayoutParams.FLAG_SECURE)else window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)}
    override fun onNewIntent(intent:Intent){super.onNewIntent(intent);setIntent(intent);handleIntent(intent)}
    private fun requestNotificationPermission(){if(Build.VERSION.SDK_INT>=33&&ContextCompat.checkSelfPermission(this,Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)ActivityCompat.requestPermissions(this,arrayOf(Manifest.permission.POST_NOTIFICATIONS),1001)}
    private fun createNotificationChannel(){if(Build.VERSION.SDK_INT>=26){val channel=NotificationChannel("circulars","Circulars & GR",NotificationManager.IMPORTANCE_HIGH);getSystemService(NotificationManager::class.java).createNotificationChannel(channel)}}
}
