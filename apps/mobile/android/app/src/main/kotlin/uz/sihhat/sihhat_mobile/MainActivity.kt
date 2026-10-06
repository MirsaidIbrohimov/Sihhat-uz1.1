package uz.sihhat.sihhat_mobile

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel

class MainActivity : FlutterActivity() {
    private var callback: ConnectivityManager.NetworkCallback? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        val manager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        EventChannel(flutterEngine.dartExecutor.binaryMessenger, "uz.sihhat/connectivity")
            .setStreamHandler(object : EventChannel.StreamHandler {
                override fun onListen(arguments: Any?, events: EventChannel.EventSink) {
                    callback?.let { manager.unregisterNetworkCallback(it) }
                    var lastOnline = false
                    val current = manager.getNetworkCapabilities(manager.activeNetwork)
                    events.success(current?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true)
                    val listener = object : ConnectivityManager.NetworkCallback() {
                        override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
                            val online = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                                capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
                            if (online != lastOnline) {
                                lastOnline = online
                                runOnUiThread { events.success(online) }
                            }
                        }
                        override fun onLost(network: Network) {
                            lastOnline = false
                            runOnUiThread { events.success(false) }
                        }
                    }
                    callback = listener
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        manager.registerDefaultNetworkCallback(listener)
                    } else {
                        manager.registerNetworkCallback(NetworkRequest.Builder()
                            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).build(), listener)
                    }
                }
                override fun onCancel(arguments: Any?) {
                    callback?.let { manager.unregisterNetworkCallback(it) }
                    callback = null
                }
            })
    }

    override fun cleanUpFlutterEngine(flutterEngine: FlutterEngine) {
        val manager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        callback?.let { manager.unregisterNetworkCallback(it) }
        callback = null
        super.cleanUpFlutterEngine(flutterEngine)
    }
}
