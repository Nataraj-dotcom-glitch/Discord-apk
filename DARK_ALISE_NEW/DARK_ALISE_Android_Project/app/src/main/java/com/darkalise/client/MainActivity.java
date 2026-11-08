package com.darkalise.client;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import android.graphics.drawable.GradientDrawable;
import android.content.Intent;
import android.provider.Settings;
import android.util.Base64;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final int REQ_MEDIA = 42;
    private FrameLayout root;
    private WebView web;
    private EditText address;
    private TextView status;
    private boolean scriptsInjected = false;
    private PermissionRequest pendingRequest;

    private int bg = Color.rgb(4,7,14), panel = Color.rgb(10,18,32), cyan = Color.rgb(42,224,236);

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(bg);
        getWindow().setNavigationBarColor(bg);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        buildUi();
        setupWeb();
        web.loadUrl("https://web.whatsapp.com/");
    }

    private GradientDrawable shape(int color, int stroke) {
        GradientDrawable d = new GradientDrawable(); d.setColor(color); d.setCornerRadius(dp(16));
        d.setStroke(dp(1), stroke); return d;
    }
    private int dp(float v) { return (int)(v * getResources().getDisplayMetrics().density + .5f); }
    private TextView button(String label) {
        TextView t = new TextView(this); t.setText(label); t.setTextColor(cyan); t.setTextSize(20);
        t.setGravity(Gravity.CENTER); t.setTypeface(Typeface.DEFAULT_BOLD); t.setBackground(shape(panel, Color.rgb(24,105,142)));
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(dp(48), dp(46)); p.setMargins(dp(3),0,dp(3),0); t.setLayoutParams(p); return t;
    }
    private void buildUi() {
        root = new FrameLayout(this); root.setBackgroundColor(bg);
        LinearLayout shell = new LinearLayout(this); shell.setOrientation(LinearLayout.VERTICAL); root.addView(shell, new FrameLayout.LayoutParams(-1,-1));
        LinearLayout title = new LinearLayout(this); title.setGravity(Gravity.CENTER_VERTICAL); title.setPadding(dp(12),dp(8),dp(12),dp(8)); title.setBackground(shape(panel,Color.rgb(20,54,75)));
        TextView logo = new TextView(this); logo.setText("DA"); logo.setTextColor(Color.WHITE); logo.setTextSize(14); logo.setGravity(Gravity.CENTER); logo.setTypeface(null,Typeface.BOLD); logo.setBackground(shape(Color.rgb(0,177,196),cyan));
        title.addView(logo,new LinearLayout.LayoutParams(dp(38),dp(38)));
        TextView name = new TextView(this); name.setText("  DARK ALISE   •   WHATSAPP CLIENT"); name.setTextColor(Color.rgb(220,239,248)); name.setTextSize(13); name.setTypeface(Typeface.MONOSPACE,Typeface.BOLD); title.addView(name,new LinearLayout.LayoutParams(0,dp(42),1));
        TextView plus = button("+"); plus.setOnClickListener(v -> { address.setText("https://web.whatsapp.com/"); loadAddress(); }); title.addView(plus);
        shell.addView(title);

        LinearLayout nav = new LinearLayout(this); nav.setGravity(Gravity.CENTER_VERTICAL); nav.setPadding(dp(5),dp(7),dp(5),dp(7)); nav.setBackgroundColor(bg);
        TextView back=button("‹"), forward=button("›"), reload=button("⟳");
        back.setOnClickListener(v->{if(web.canGoBack())web.goBack();}); forward.setOnClickListener(v->{if(web.canGoForward())web.goForward();}); reload.setOnClickListener(v->web.reload());
        nav.addView(back); nav.addView(forward); nav.addView(reload);
        address = new EditText(this); address.setSingleLine(true); address.setText("https://web.whatsapp.com/"); address.setTextColor(Color.rgb(203,222,239)); address.setHintTextColor(Color.GRAY); address.setTextSize(13); address.setPadding(dp(12),0,dp(12),0); address.setBackground(shape(panel,Color.rgb(34,77,103))); address.setSelectAllOnFocus(true); address.setImeOptions(6);
        LinearLayout.LayoutParams ap=new LinearLayout.LayoutParams(0,dp(46),1); ap.setMargins(dp(5),0,dp(5),0); nav.addView(address,ap); address.setOnEditorActionListener((v,a,e)->{loadAddress();return true;});
        TextView star=button("☆"); star.setOnClickListener(v->Toast.makeText(this,"WhatsApp Web is your home page",Toast.LENGTH_SHORT).show()); nav.addView(star);
        shell.addView(nav);
        status = new TextView(this); status.setText("●  SECURE WEB SESSION                                      V1 // AURORA"); status.setTextColor(cyan); status.setTextSize(10); status.setPadding(dp(15),dp(5),dp(8),dp(5)); status.setBackgroundColor(Color.rgb(7,15,26)); shell.addView(status);

        web = new WebView(this); web.setBackgroundColor(bg); shell.addView(web,new LinearLayout.LayoutParams(-1,0,1));
        // Floating shortcut stack inspired by the supplied reference image.
        LinearLayout floatBar = new LinearLayout(this); floatBar.setOrientation(LinearLayout.VERTICAL); floatBar.setPadding(dp(6),dp(6),dp(6),dp(6)); floatBar.setBackground(shape(panel,Color.rgb(30,90,120)));
        TextView studio=button("☷"), power=button("⏻"), sound=button("♫");
        studio.setOnClickListener(v->runJs("if(window.__DARK_ALISE_PANEL_TOGGLE__)window.__DARK_ALISE_PANEL_TOGGLE__();else alert('Voice Studio loads after WhatsApp Web finishes opening.');"));
        power.setOnClickListener(v->{web.reload(); Toast.makeText(this,"Refreshing WhatsApp Web",Toast.LENGTH_SHORT).show();});
        sound.setOnClickListener(v->runJs("var e=document.getElementById('__sp10_host__'); if(e){var b=e.querySelector('#sp10-bubble'); if(b)b.click();} else alert('SoundPad is not available on this page yet.');"));
        floatBar.addView(studio); floatBar.addView(power); floatBar.addView(sound);
        FrameLayout.LayoutParams fp=new FrameLayout.LayoutParams(-2,-2,Gravity.RIGHT|Gravity.CENTER_VERTICAL); fp.setMargins(0,0,dp(10),0); root.addView(floatBar,fp);
        setContentView(root);
    }

    private void setupWeb() {
        WebSettings s=web.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setDatabaseEnabled(true); s.setMediaPlaybackRequiresUserGesture(false); s.setJavaScriptCanOpenWindowsAutomatically(true); s.setSupportMultipleWindows(false); s.setLoadsImagesAutomatically(true); s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setUserAgentString(s.getUserAgentString().replace("; wv", "").replace(" Mobile", ""));
        CookieManager.getInstance().setAcceptCookie(true); CookieManager.getInstance().setAcceptThirdPartyCookies(web,true);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req){ Uri u=req.getUrl(); String host=u.getHost(); if(host!=null && (host.equals("web.whatsapp.com")||host.endsWith("whatsapp.com")||host.equals("www.whatsapp.com"))){address.setText(u.toString());return false;} return true; }
            @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap icon){ scriptsInjected=false; address.setText(url); status.setText("●  CONNECTING TO WHATSAPP WEB"); }
            @Override public void onPageCommitVisible(WebView view,String url){ address.setText(url); status.setText("●  WHATSAPP WEB // DARK ALISE ACTIVE"); injectExtensions(); }
            @Override public void onPageFinished(WebView view,String url){ if(!scriptsInjected) injectExtensions(); }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onPermissionRequest(PermissionRequest request){
                pendingRequest=request;
                if(Build.VERSION.SDK_INT>=23 && (checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED || checkSelfPermission(Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED)){
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO,Manifest.permission.CAMERA},REQ_MEDIA);
                } else request.grant(request.getResources());
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request){ if(pendingRequest==request)pendingRequest=null; }
        });
    }
    private String readAsset(String path) throws Exception { InputStream in=getAssets().open(path); ByteArrayOutputStream out=new ByteArrayOutputStream(); byte[] b=new byte[8192]; int n; while((n=in.read(b))>0)out.write(b,0,n); in.close(); return out.toString("UTF-8"); }
    private void inject(String path){ try { String js=readAsset(path); String b64=Base64.encodeToString(js.getBytes(StandardCharsets.UTF_8),Base64.NO_WRAP); runJs("(function(){var s=atob('"+b64+"');(0,eval)(s);})();"); } catch(Exception e){ status.setText("●  ADD-ON LOAD ERROR: "+path); } }
    private void injectExtensions(){ if(scriptsInjected || web==null)return; scriptsInjected=true;
        // Install the sound mixer first, then its panel, followed by the Voice Studio interface.
        inject("soundpad/hook.js"); inject("soundpad/content.js");
        inject("voice_studio/injector.js");
    }
    private void runJs(String js){ if(web!=null)web.evaluateJavascript(js,null); }
    private void loadAddress(){ String u=address.getText().toString().trim(); if(!u.startsWith("https://")&&!u.startsWith("http://"))u="https://"+u; web.loadUrl(u); }
    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] results){ super.onRequestPermissionsResult(requestCode,permissions,results); if(requestCode==REQ_MEDIA && pendingRequest!=null){ boolean ok=true; for(int r:results)if(r!=PackageManager.PERMISSION_GRANTED)ok=false; if(ok)pendingRequest.grant(pendingRequest.getResources()); else pendingRequest.deny(); pendingRequest=null; } }
    @Override public void onBackPressed(){ if(web!=null && web.canGoBack())web.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy(){ if(web!=null){web.stopLoading();web.destroy();} super.onDestroy(); }
}
