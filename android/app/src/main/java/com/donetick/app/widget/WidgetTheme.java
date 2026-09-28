package com.donetick.app.widget;

import android.content.Context;
import android.content.res.Configuration;
import android.widget.RemoteViews;

import androidx.core.content.ContextCompat;

import com.donetick.app.R;

/**
 * Light/dark palette for the task widgets.
 *
 * RemoteViews resolve `@color` and `@drawable` references in the *launcher's*
 * configuration, so a widget can't be pinned to one scheme through resource
 * qualifiers alone — values-night always wins when the phone is in dark mode.
 * This class works around that: {@link #of} hands back a Context whose
 * configuration carries the requested uiMode, so resource lookups made here
 * resolve to the forced scheme, and {@link #apply} writes the results onto the
 * views explicitly.
 *
 * In AUTO mode nothing is forced — the launcher keeps picking, which is what the
 * widgets did before this option existed.
 */
public final class WidgetTheme {
    public static final int MODE_AUTO = 0;
    public static final int MODE_LIGHT = 1;
    public static final int MODE_DARK = 2;
    /** Per-widget sentinel meaning "follow the app-wide setting". */
    public static final int MODE_INHERIT = -1;

    private final Context context;
    private final boolean forced;

    private WidgetTheme(Context context, boolean forced) {
        this.context = context;
        this.forced = forced;
    }

    /** The palette a given widget instance should draw with. */
    public static WidgetTheme of(Context base, int appWidgetId) {
        return forMode(base, WidgetStore.theme(base, appWidgetId));
    }

    public static WidgetTheme forMode(Context base, int mode) {
        if (mode != MODE_LIGHT && mode != MODE_DARK) {
            return new WidgetTheme(base, false);
        }
        Configuration config = new Configuration(base.getResources().getConfiguration());
        config.uiMode = (config.uiMode & ~Configuration.UI_MODE_NIGHT_MASK)
                | (mode == MODE_DARK
                        ? Configuration.UI_MODE_NIGHT_YES
                        : Configuration.UI_MODE_NIGHT_NO);
        return new WidgetTheme(base.createConfigurationContext(config), true);
    }

    /** A Context to resolve widget colors against. */
    public Context context() {
        return context;
    }

    public int color(int colorRes) {
        return ContextCompat.getColor(context, colorRes);
    }

    public int bg() {
        return color(R.color.widget_bg);
    }

    public int textPrimary() {
        return color(R.color.widget_text_primary);
    }

    public int textSecondary() {
        return color(R.color.widget_text_secondary);
    }

    /**
     * Repaint the shell's own views. A no-op in AUTO mode: the layout XML
     * already points at the themed colors and the launcher resolves them.
     */
    public void apply(RemoteViews views) {
        if (!forced) return;
        views.setTextColor(R.id.widget_title, textPrimary());
        views.setTextColor(R.id.widget_subtitle, textSecondary());
        views.setTextColor(R.id.widget_empty, textSecondary());
        views.setTextColor(R.id.widget_count, color(R.color.widget_accent));
        views.setTextColor(R.id.widget_refresh, color(R.color.widget_accent));
        views.setInt(R.id.widget_count, "setBackgroundResource", pillBackground());
        views.setInt(R.id.widget_refresh, "setBackgroundResource", pillBackground());
        views.setInt(R.id.widget_add, "setBackgroundResource", pillBackground());
        // Vector tint resources are otherwise resolved in the launcher's device
        // scheme, which can disagree with a widget's explicit theme override.
        views.setInt(R.id.widget_add, "setColorFilter", color(R.color.widget_accent));
    }

    /**
     * The widget background. Forced schemes can't use @drawable/widget_background
     * (its solid color resolves on the host), so they draw the untinted
     * widget_surface shape and color-filter it instead.
     */
    public void applyBackground(Context base, RemoteViews views, int appWidgetId) {
        if (forced) {
            views.setImageViewResource(R.id.widget_background_layer, R.drawable.widget_surface);
            WidgetUi.applyOpacity(base, views, appWidgetId, bg());
        } else {
            views.setImageViewResource(R.id.widget_background_layer, R.drawable.widget_background);
            WidgetUi.applyOpacity(base, views, appWidgetId);
        }
    }

    /** Whether row views need their colors written explicitly. */
    public boolean isForced() {
        return forced;
    }

    private int pillBackground() {
        return isDark() ? R.drawable.widget_count_bg_dark : R.drawable.widget_count_bg_light;
    }

    public int tileBackground() {
        return isDark() ? R.drawable.widget_tile_bg_dark : R.drawable.widget_tile_bg_light;
    }

    private boolean isDark() {
        return (context.getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
    }
}
