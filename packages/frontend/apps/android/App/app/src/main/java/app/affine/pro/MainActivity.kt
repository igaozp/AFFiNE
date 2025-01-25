package app.affine.pro

import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.annotation.RequiresApi
import com.getcapacitor.BridgeActivity
import uniffi.affine_mobile_native.hashcashMint;

class MainActivity : BridgeActivity() {
    @RequiresApi(Build.VERSION_CODES.R)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
    }
}
