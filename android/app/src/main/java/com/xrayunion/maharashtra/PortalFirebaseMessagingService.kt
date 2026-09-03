package com.xrayunion.maharashtra

import android.app.PendingIntent
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class PortalFirebaseMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        // The web app can also register its FCM token. Server-side token storage is recommended.
        getSharedPreferences("push", MODE_PRIVATE).edit().putString("fcm_token", token).apply()
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        val title = data["title"] ?: message.notification?.title ?: "नवीन सूचना"
        val body = data["body"] ?: message.notification?.body ?: ""
        val deepLink = data["deepLink"] ?: data["url"] ?: "https://xrayunionmah.web.app/"
        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra("deep_link", deepLink)
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pi = PendingIntent.getActivity(this, deepLink.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val n = NotificationCompat.Builder(this, "circulars")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title).setContentText(body).setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH).setContentIntent(pi).build()
        NotificationManagerCompat.from(this).notify(deepLink.hashCode(), n)
    }
}
