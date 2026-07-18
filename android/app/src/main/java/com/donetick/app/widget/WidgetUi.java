package com.donetick.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import com.donetick.app.MainActivity;
import com.donetick.app.R;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/** Builds the shell RemoteViews shared by the widgets and pushes updates. */
public final class WidgetUi {
    public static final String MODE_TODAY = "today";
    public static final String MODE_WEEK = "week";
    public static final String MODE_PEOPLE = "people";
    public static final String EXTRA_MODE = "com.donetick.app.widget.MODE";

    private WidgetUi() {}

    /** Full refresh: redraw headers and reload list content (used by the JS bridge). */
    public static void refreshAll(Context context) {
        updateHeaders(context);
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        manager.notifyAppWidgetViewDataChanged(
                widgetIds(context, manager, TodayWidgetProvider.class), R.id.widget_list);
        manager.notifyAppWidgetViewDataChanged(
                widgetIds(context, manager, WeekWidgetProvider.class), R.id.widget_list);
        manager.notifyAppWidgetViewDataChanged(
                widgetIds(context, manager, PeopleWidgetProvider.class), R.id.widget_list);
    }

    /** Redraw title/count/subtitle only — safe to call from the list factory. */
    public static void updateHeaders(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        for (int id : widgetIds(context, manager, TodayWidgetProvider.class)) {
            manager.updateAppWidget(id, build(context, MODE_TODAY, id));
        }
        for (int id : widgetIds(context, manager, WeekWidgetProvider.class)) {
            manager.updateAppWidget(id, build(context, MODE_WEEK, id));
        }
        for (int id : widgetIds(context, manager, PeopleWidgetProvider.class)) {
            manager.updateAppWidget(id, build(context, MODE_PEOPLE, id));
        }
    }

    private static int[] widgetIds(Context context, AppWidgetManager manager, Class<?> provider) {
        return manager.getAppWidgetIds(new ComponentName(context, provider));
    }

    public static RemoteViews build(Context context, String mode, int appWidgetId) {
        boolean today = MODE_TODAY.equals(mode);
        boolean people = MODE_PEOPLE.equals(mode);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_shell);

        int titleRes = today ? R.string.widget_today_title
                : people ? R.string.widget_people_title
                : R.string.widget_week_title;
        views.setTextViewText(R.id.widget_title, context.getString(titleRes));

        if (people) {
            views.setViewVisibility(R.id.widget_count, View.GONE);
        } else {
            boolean includeOthers = WidgetStore.includeOthers(context, appWidgetId);
            List<WidgetStore.Task> tasks = WidgetStore.visibleTasks(
                    context, WidgetStore.loadTasks(context), includeOthers);
            int count = (today ? WidgetStore.todaySubset(tasks) : tasks).size();
            views.setTextViewText(R.id.widget_count, String.valueOf(count));
            views.setViewVisibility(R.id.widget_count, count > 0 ? View.VISIBLE : View.GONE);
        }

        views.setTextViewText(R.id.widget_subtitle, subtitle(context));

        if (!WidgetStore.hasConfig(context)) {
            views.setTextViewText(R.id.widget_empty,
                    context.getString(R.string.widget_signed_out));
        } else {
            int emptyRes = today ? R.string.widget_empty_today
                    : people ? R.string.widget_empty_people
                    : R.string.widget_empty_week;
            views.setTextViewText(R.id.widget_empty, context.getString(emptyRes));
        }

        // The Today widget gets a quick-add button that deep links straight
        // into the in-app AddTaskModal.
        if (today) {
            Intent addTask = new Intent(context, MainActivity.class);
            addTask.setAction(Intent.ACTION_VIEW);
            addTask.setData(Uri.parse("donetick://chores/add"));
            views.setOnClickPendingIntent(R.id.widget_add, PendingIntent.getActivity(
                    context, 2, addTask,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            views.setViewVisibility(R.id.widget_add, View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_add, View.GONE);
        }

        // List content comes from WidgetListService; mode travels in the intent
        // and the unique data URI keeps the adapters from being collapsed.
        Intent adapterIntent = new Intent(context, WidgetListService.class);
        adapterIntent.putExtra(EXTRA_MODE, mode);
        adapterIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        adapterIntent.setData(Uri.parse("donetickwidget://" + mode + "/" + appWidgetId));
        views.setRemoteAdapter(R.id.widget_list, adapterIntent);
        views.setEmptyView(R.id.widget_list, R.id.widget_empty);

        // Row taps deep link into the chore view; the row's fill-in intent
        // supplies the donetick://chores/<id> data URI.
        Intent rowTemplate = new Intent(context, MainActivity.class);
        rowTemplate.setAction(Intent.ACTION_VIEW);
        views.setPendingIntentTemplate(R.id.widget_list, PendingIntent.getActivity(
                context, 1, rowTemplate,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE));

        // Anywhere else on the widget simply opens the app.
        Intent openApp = new Intent(context, MainActivity.class);
        views.setOnClickPendingIntent(R.id.widget_container, PendingIntent.getActivity(
                context, 0, openApp,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        return views;
    }

    private static String subtitle(Context context) {
        String date = new SimpleDateFormat("EEE, MMM d", Locale.getDefault())
                .format(new Date());
        long lastUpdated = WidgetStore.lastUpdated(context);
        if (lastUpdated <= 0) return date;
        String time = android.text.format.DateFormat.getTimeFormat(context)
                .format(new Date(lastUpdated));
        return date + " · " + context.getString(R.string.widget_updated_at, time);
    }
}
