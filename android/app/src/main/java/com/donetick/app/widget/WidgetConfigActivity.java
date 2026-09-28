package com.donetick.app.widget;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.CheckBox;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.SeekBar;
import android.widget.Switch;
import android.widget.TextView;

import com.donetick.app.R;

/**
 * Placement / long-press configuration, shared by every widget that declares
 * android:configure. Two options:
 *   - include tasks assigned to other circle members (task widgets only);
 *   - background opacity, either inherited from Settings → Widgets or
 *     overridden for this one widget;
 *   - colour scheme, likewise inherited or pinned to light/dark.
 * All are stored per appWidgetId so mixed setups work side by side.
 */
public class WidgetConfigActivity extends Activity {
    private int appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        appWidgetId = getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID);
        // Cancelled result until Save, so backing out never adds a half-configured widget.
        setResult(RESULT_CANCELED, resultIntent());
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }

        setContentView(R.layout.widget_config);

        Switch includeOthers = findViewById(R.id.config_include_others);
        includeOthers.setChecked(WidgetStore.includeOthers(this, appWidgetId));
        findViewById(R.id.config_include_others_group).setVisibility(
                hasAssigneeOption() ? View.VISIBLE : View.GONE);

        int globalOpacity = WidgetStore.globalOpacity(this);
        int override = WidgetStore.opacityOverride(this, appWidgetId);

        CheckBox useDefault = findViewById(R.id.config_opacity_default);
        SeekBar opacity = findViewById(R.id.config_opacity);
        TextView opacityValue = findViewById(R.id.config_opacity_value);
        View opacityGroup = findViewById(R.id.config_opacity_group);

        useDefault.setText(getString(R.string.widget_config_opacity_default, globalOpacity));
        useDefault.setChecked(override == WidgetStore.OPACITY_INHERIT);
        opacity.setProgress(override == WidgetStore.OPACITY_INHERIT ? globalOpacity : override);
        opacityValue.setText(getString(R.string.widget_config_opacity_value, opacity.getProgress()));
        opacityGroup.setVisibility(useDefault.isChecked() ? View.GONE : View.VISIBLE);

        useDefault.setOnCheckedChangeListener((button, checked) ->
                opacityGroup.setVisibility(checked ? View.GONE : View.VISIBLE));
        opacity.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar bar, int progress, boolean fromUser) {
                opacityValue.setText(getString(R.string.widget_config_opacity_value, progress));
            }

            @Override
            public void onStartTrackingTouch(SeekBar bar) {}

            @Override
            public void onStopTrackingTouch(SeekBar bar) {}
        });

        RadioGroup themeGroup = findViewById(R.id.config_theme_group);
        RadioButton themeInherit = findViewById(R.id.config_theme_inherit);
        themeInherit.setText(getString(R.string.widget_config_theme_default,
                getString(themeLabel(WidgetStore.globalTheme(this)))));
        themeGroup.check(themeButtonFor(WidgetStore.themeOverride(this, appWidgetId)));

        findViewById(R.id.config_save).setOnClickListener(v -> {
            WidgetStore.setIncludeOthers(this, appWidgetId, includeOthers.isChecked());
            WidgetStore.setOpacityOverride(this, appWidgetId,
                    useDefault.isChecked() ? WidgetStore.OPACITY_INHERIT : opacity.getProgress());
            WidgetStore.setThemeOverride(this, appWidgetId,
                    themeModeFor(themeGroup.getCheckedRadioButtonId()));
            WidgetUi.refreshAll(this);
            setResult(RESULT_OK, resultIntent());
            finish();
        });
    }

    private static int themeButtonFor(int mode) {
        switch (mode) {
            case WidgetTheme.MODE_AUTO: return R.id.config_theme_auto;
            case WidgetTheme.MODE_LIGHT: return R.id.config_theme_light;
            case WidgetTheme.MODE_DARK: return R.id.config_theme_dark;
            default: return R.id.config_theme_inherit;
        }
    }

    private static int themeModeFor(int checkedId) {
        if (checkedId == R.id.config_theme_auto) return WidgetTheme.MODE_AUTO;
        if (checkedId == R.id.config_theme_light) return WidgetTheme.MODE_LIGHT;
        if (checkedId == R.id.config_theme_dark) return WidgetTheme.MODE_DARK;
        return WidgetTheme.MODE_INHERIT;
    }

    private static int themeLabel(int mode) {
        switch (mode) {
            case WidgetTheme.MODE_LIGHT: return R.string.widget_theme_light;
            case WidgetTheme.MODE_DARK: return R.string.widget_theme_dark;
            default: return R.string.widget_theme_auto;
        }
    }

    /**
     * Whether "show everyone's tasks" means anything for the widget being
     * configured. The people/project/filter widgets always cover the whole
     * circle, and the shortcut widgets carry no task data at all.
     */
    private boolean hasAssigneeOption() {
        AppWidgetProviderInfo info =
                AppWidgetManager.getInstance(this).getAppWidgetInfo(appWidgetId);
        if (info == null || info.provider == null) return true;
        String provider = info.provider.getClassName();
        return provider.equals(TodayWidgetProvider.class.getName())
                || provider.equals(WeekWidgetProvider.class.getName());
    }

    private Intent resultIntent() {
        return new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
    }
}
