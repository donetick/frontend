package com.donetick.app.widget;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;

/**
 * Member avatars for the widgets: downloads and circle-crops profile photos
 * (cached on disk for a day) and falls back to a colored initials disc.
 * Downloads must only happen from a background/binder thread —
 * RemoteViewsFactory.onDataSetChanged qualifies.
 */
final class AvatarCache {
    private static final String TAG = "DonetickWidget";
    private static final String DIR = "widget_avatars";
    private static final long MAX_AGE_MS = 24 * 60 * 60 * 1000;
    private static final int SIZE_PX = 96;

    // Joy-ish palette for initials discs; picked by hashing the member id so
    // each person keeps a stable color.
    private static final int[] PALETTE = {
            0xFF0B6BCB, 0xFF147D57, 0xFF9C4DD3, 0xFFC2410C,
            0xFF0E7490, 0xFFB02A5B, 0xFF5B21B6, 0xFF937800,
    };

    private AvatarCache() {}

    /** Photo avatar or null; never throws, never touches the network on failure loops. */
    static Bitmap photo(Context context, WidgetStore.Member member) {
        if (member == null || member.image == null || !member.image.startsWith("http")) {
            return null;
        }
        try {
            File dir = new File(context.getCacheDir(), DIR);
            if (!dir.exists()) dir.mkdirs();
            File file = new File(dir, member.id + ".png");
            if (file.exists()
                    && System.currentTimeMillis() - file.lastModified() < MAX_AGE_MS) {
                return BitmapFactory.decodeFile(file.getAbsolutePath());
            }
            Bitmap downloaded = download(member.image);
            if (downloaded == null) {
                // Keep serving a stale copy rather than nothing.
                return file.exists() ? BitmapFactory.decodeFile(file.getAbsolutePath()) : null;
            }
            Bitmap circled = circleCrop(downloaded);
            try (FileOutputStream out = new FileOutputStream(file)) {
                circled.compress(Bitmap.CompressFormat.PNG, 100, out);
            }
            return circled;
        } catch (Exception e) {
            Log.w(TAG, "Avatar load failed for member " + member.id, e);
            return null;
        }
    }

    /** Colored disc with the member's first initial — the no-photo fallback. */
    static Bitmap initials(WidgetStore.Member member) {
        String name = member != null && member.name != null ? member.name.trim() : "";
        String letter = name.isEmpty()
                ? "?"
                : new String(Character.toChars(name.codePointAt(0))).toUpperCase(Locale.getDefault());
        int color = PALETTE[Math.abs((member != null ? member.id : "?").hashCode()) % PALETTE.length];

        Bitmap bitmap = Bitmap.createBitmap(SIZE_PX, SIZE_PX, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(color);
        canvas.drawCircle(SIZE_PX / 2f, SIZE_PX / 2f, SIZE_PX / 2f, paint);

        Paint text = new Paint(Paint.ANTI_ALIAS_FLAG);
        text.setColor(Color.WHITE);
        text.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        text.setTextSize(SIZE_PX * 0.42f);
        text.setTextAlign(Paint.Align.CENTER);
        Rect bounds = new Rect();
        text.getTextBounds(letter, 0, letter.length(), bounds);
        canvas.drawText(letter, SIZE_PX / 2f, SIZE_PX / 2f + bounds.height() / 2f, text);
        return bitmap;
    }

    /** Best avatar for a member: photo when available, initials otherwise. */
    static Bitmap get(Context context, WidgetStore.Member member) {
        Bitmap photo = photo(context, member);
        return photo != null ? photo : initials(member);
    }

    private static Bitmap download(String imageUrl) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(imageUrl).openConnection();
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(10000);
            if (connection.getResponseCode() != 200) return null;
            try (InputStream stream = connection.getInputStream()) {
                Bitmap raw = BitmapFactory.decodeStream(stream);
                if (raw == null) return null;
                return Bitmap.createScaledBitmap(raw, SIZE_PX, SIZE_PX, true);
            }
        } catch (Exception e) {
            Log.w(TAG, "Avatar download failed", e);
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static Bitmap circleCrop(Bitmap source) {
        Bitmap output = Bitmap.createBitmap(SIZE_PX, SIZE_PX, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setShader(new BitmapShader(source, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP));
        canvas.drawCircle(SIZE_PX / 2f, SIZE_PX / 2f, SIZE_PX / 2f, paint);
        return output;
    }
}
