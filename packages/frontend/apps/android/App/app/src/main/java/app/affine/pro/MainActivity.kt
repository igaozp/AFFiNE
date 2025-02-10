package app.affine.pro

import android.os.Build
import android.os.Bundle
import androidx.annotation.RequiresApi
import com.getcapacitor.BridgeActivity
import com.getcapacitor.plugin.CapacitorCookies
import com.getcapacitor.plugin.CapacitorHttp
import ee.forgr.capacitor_inappbrowser.InAppBrowserPlugin


class MainActivity : BridgeActivity() {
    @RequiresApi(Build.VERSION_CODES.R)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        registerPlugins(
            listOf(
                CapacitorHttp::class.java,
                CapacitorCookies::class.java,
                InAppBrowserPlugin::class.java
            )
        )
    }
}
