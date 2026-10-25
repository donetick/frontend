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
import android.widget.Spinner;
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
        includeOthers.setChecked(WidgetStore.includeOthers(
                this, appWidgetId, defaultsToEveryone()));
        findViewById(R.id.config_include_others_group).setVisibility(
                hasAssigneeOption() ? View.VISIBLE : View.GONE);
        View quickActionsGroup = findViewById(R.id.config_quick_actions_group);
        boolean isQuickActions = isQuickActionsWidget();
        quickActionsGroup.setVisibility(isQuickActions ? View.VISIBLE : View.GONE);
        Spinner[] quickActions = {
                findViewById(R.id.config_action_0), findViewById(R.id.config_action_1),
                findViewById(R.id.config_action_2), findViewById(R.id.config_action_3)
        };
        if (isQuickActions) {
            for (int slot = 0; slot < quickActions.length; slot++) {
                quickActions[slot].setSelection(actionIndex(WidgetStore.quickAction(this, appWidgetId, slot)));
            }
        }

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
            if (isQuickActions) {
                for (int slot = 0; slot < quickActions.length; slot++) {
                    WidgetStore.setQuickAction(this, appWidgetId, slot,
                            actionValue(quickActions[slot].getSelectedItemPosition()));
                }
            }
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

    /** Whether this widget renders tasks that can be narrowed by assignee. */
    private boolean hasAssigneeOption() {
        String provider = providerClassName();
        if (provider == null) return true;
        return provider.equals(TodayWidgetProvider.class.getName())
                || provider.equals(WeekWidgetProvider.class.getName())
                || provider.equals(ProjectWidgetProvider.class.getName())
                || provider.equals(FilterWidgetProvider.class.getName());
    }

    /** Project and filter widgets preserve their existing everyone-first behavior. */
    private boolean defaultsToEveryone() {
        String provider = providerClassName();
        return ProjectWidgetProvider.class.getName().equals(provider)
                || FilterWidgetProvider.class.getName().equals(provider);
    }

    private String providerClassName() {
        AppWidgetProviderInfo info =
                AppWidgetManager.getInstance(this).getAppWidgetInfo(appWidgetId);
        return info == null || info.provider == null ? null : info.provider.getClassName();
    }

    private boolean isQuickActionsWidget() {
        AppWidgetProviderInfo info =
                AppWidgetManager.getInstance(this).getAppWidgetInfo(appWidgetId);
        return info != null && info.provider != null
                && info.provider.getClassName().equals(QuickActionsWidgetProvider.class.getName());
    }

    private static int actionIndex(String action) {
        String[] values = { "type", "voice", "scan", "search", "projects", "overview" };
        for (int i = 0; i < values.length; i++) if (values[i].equals(action)) return i;
        return 0;
    }

    private static String actionValue(int index) {
        String[] values = { "type", "voice", "scan", "search", "projects", "overview" };
        return values[Math.max(0, Math.min(values.length - 1, index))];
    }

    private Intent resultIntent() {
        return new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
    }
}
