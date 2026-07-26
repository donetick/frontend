package com.donetick.app.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import androidx.core.content.ContextCompat;

import com.donetick.app.R;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Feeds task rows, day-group headers, and people rows to the widget ListView. */
public class WidgetListService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        String mode = intent.getStringExtra(WidgetUi.EXTRA_MODE);
        int appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID);
        return new WidgetListFactory(getApplicationContext(),
                mode != null ? mode : WidgetUi.MODE_TODAY, appWidgetId);
    }

    static class Row {
        final String header;             // non-null for day-group headers
        final WidgetStore.Task task;     // non-null for task rows
        final WidgetStore.Member person; // non-null for people rows
        int todayCount;
        int weekCount;

        Row(String header, WidgetStore.Task task, WidgetStore.Member person) {
            this.header = header;
            this.task = task;
            this.person = person;
        }
    }

    static class WidgetListFactory implements RemoteViewsFactory {
        private final Context context;
        private final String mode;
        private final int appWidgetId;
        private List<Row> rows = new ArrayList<>();
        private final Map<String, Bitmap> avatars = new HashMap<>();
        private String myUserId;
        private boolean includeOthers;

        WidgetListFactory(Context context, String mode, int appWidgetId) {
            this.context = context;
            this.mode = mode;
            this.appWidgetId = appWidgetId;
        }

        @Override
        public void onCreate() {}

        @Override
        public void onDataSetChanged() {
            // Runs on a binder thread, so synchronous network work is allowed
            // here. This is the background-refresh path: the 30-minute
            // updatePeriodMillis cycle lands here via notifyAppWidgetViewDataChanged.
            boolean refreshed = WidgetStore.refreshFromServerIfStale(context);

            myUserId = WidgetStore.userId(context);
            includeOthers = WidgetStore.includeOthers(context, appWidgetId);
            List<WidgetStore.Task> allTasks = WidgetStore.loadTasks(context);
            List<WidgetStore.Member> members = WidgetStore.loadMembers(context);

            if (WidgetUi.MODE_PEOPLE.equals(mode)) {
                rows = buildPeopleRows(allTasks, members);
                loadAvatars(members);
            } else {
                List<WidgetStore.Task> tasks =
                        WidgetStore.visibleTasks(context, allTasks, includeOthers);
                rows = WidgetUi.MODE_TODAY.equals(mode)
                        ? buildTodayRows(tasks)
                        : buildWeekRows(tasks);
                if (includeOthers) loadAvatars(members);
            }

            if (refreshed) {
                // Counts and "Updated …" line live outside the list.
                WidgetUi.updateHeaders(context);
            }
        }

        /** Resolve avatars for everyone up front — getViewAt must not block. */
        private void loadAvatars(List<WidgetStore.Member> members) {
            avatars.clear();
            for (WidgetStore.Member member : members) {
                avatars.put(member.id, AvatarCache.get(context, member));
            }
        }

        private List<Row> buildTodayRows(List<WidgetStore.Task> tasks) {
            List<Row> result = new ArrayList<>();
            for (WidgetStore.Task task : WidgetStore.todaySubset(tasks)) {
                result.add(new Row(null, task, null));
            }
            return result;
        }

        private List<Row> buildWeekRows(List<WidgetStore.Task> tasks) {
            List<Row> result = new ArrayList<>();
            long startOfToday = WidgetStore.endOfDay(-1) + 1;
            SimpleDateFormat dayFormat = new SimpleDateFormat("EEE, MMM d", Locale.getDefault());

            List<WidgetStore.Task> approvals = new ArrayList<>();
            List<WidgetStore.Task> scheduled = new ArrayList<>();
            for (WidgetStore.Task task : tasks) {
                if (task.approval) approvals.add(task);
                else if (task.dueDate != null) scheduled.add(task);
            }

            if (!approvals.isEmpty()) {
                result.add(new Row(context.getString(R.string.widget_group_approval), null, null));
                for (WidgetStore.Task task : approvals) result.add(new Row(null, task, null));
            }

            String currentGroup = null;
            for (WidgetStore.Task task : scheduled) {
                String group;
                if (task.dueDate < startOfToday) {
                    group = context.getString(R.string.widget_group_overdue);
                } else if (task.dueDate <= WidgetStore.endOfDay(0)) {
                    group = context.getString(R.string.widget_group_today);
                } else if (task.dueDate <= WidgetStore.endOfDay(1)) {
                    group = context.getString(R.string.widget_group_tomorrow);
                } else {
                    group = dayFormat.format(new Date(task.dueDate));
                }
                if (!group.equals(currentGroup)) {
                    result.add(new Row(group, null, null));
                    currentGroup = group;
                }
                result.add(new Row(null, task, null));
            }
            return result;
        }

        /** One row per member with today/week workloads, busiest first. */
        private List<Row> buildPeopleRows(List<WidgetStore.Task> tasks,
                                          List<WidgetStore.Member> members) {
            List<Row> result = new ArrayList<>();
            List<WidgetStore.Task> todayTasks = WidgetStore.todaySubset(tasks);
            for (WidgetStore.Member member : members) {
                Row row = new Row(null, null, member);
                for (WidgetStore.Task task : tasks) {
                    if (member.id.equals(task.assignedTo)) row.weekCount++;
                }
                for (WidgetStore.Task task : todayTasks) {
                    if (member.id.equals(task.assignedTo)) row.todayCount++;
                }
                result.add(row);
            }
            java.util.Collections.sort(result, (a, b) -> {
                if (a.todayCount != b.todayCount) return b.todayCount - a.todayCount;
                if (a.weekCount != b.weekCount) return b.weekCount - a.weekCount;
                return a.person.name.compareToIgnoreCase(b.person.name);
            });
            return result;
        }

        @Override
        public RemoteViews getViewAt(int position) {
            if (position < 0 || position >= rows.size()) return null;
            Row row = rows.get(position);

            if (row.header != null) {
                RemoteViews views = new RemoteViews(context.getPackageName(),
                        R.layout.widget_row_day_header);
                views.setTextViewText(R.id.row_day, row.header);
                return views;
            }

            if (row.person != null) {
                return buildPersonRow(row);
            }

            WidgetStore.Task task = row.task;
            RemoteViews views = new RemoteViews(context.getPackageName(),
                    R.layout.widget_row_task);
            views.setTextViewText(R.id.row_title, task.name);

            boolean overdue = !task.approval && task.dueDate != null
                    && task.dueDate < System.currentTimeMillis();
            int secondary = ContextCompat.getColor(context, R.color.widget_text_secondary);
            int warning = ContextCompat.getColor(context, R.color.widget_warning);
            int danger = ContextCompat.getColor(context, R.color.widget_overdue);

            String meta;
            int metaColor;
            if (task.approval) {
                meta = context.getString(R.string.widget_meta_approval);
                metaColor = warning;
            } else if (overdue) {
                meta = context.getString(R.string.widget_meta_overdue);
                metaColor = danger;
            } else {
                meta = android.text.format.DateFormat.getTimeFormat(context)
                        .format(new Date(task.dueDate));
                metaColor = secondary;
            }
            views.setTextViewText(R.id.row_meta, meta);
            views.setTextColor(R.id.row_meta, metaColor);

            int ringColor;
            if (task.approval) ringColor = warning;
            else if (overdue || task.priority == 1) ringColor = danger;
            else if (task.priority == 2) ringColor = warning;
            else ringColor = ContextCompat.getColor(context, R.color.widget_ring_neutral);
            views.setInt(R.id.row_ring, "setColorFilter", ringColor);

            // In "everyone" mode, show who a task belongs to (own tasks stay clean).
            Bitmap avatar = includeOthers && task.assignedTo != null
                    && !task.assignedTo.equals(myUserId)
                    ? avatars.get(task.assignedTo)
                    : null;
            if (avatar != null) {
                views.setImageViewBitmap(R.id.row_avatar, avatar);
                views.setViewVisibility(R.id.row_avatar, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.row_avatar, View.GONE);
            }

            Intent fillIn = new Intent();
            fillIn.setData(Uri.parse("donetick://chores/" + task.id));
            views.setOnClickFillInIntent(R.id.row_root, fillIn);
            return views;
        }

        private RemoteViews buildPersonRow(Row row) {
            RemoteViews views = new RemoteViews(context.getPackageName(),
                    R.layout.widget_row_person);
            Bitmap avatar = avatars.get(row.person.id);
            if (avatar == null) avatar = AvatarCache.initials(row.person);
            views.setImageViewBitmap(R.id.person_avatar, avatar);
            views.setTextViewText(R.id.person_name, row.person.name);
            views.setTextViewText(R.id.person_counts, context.getString(
                    R.string.widget_person_counts, row.todayCount, row.weekCount));

            // Highlight the today-count when someone has work due today.
            int accent = ContextCompat.getColor(context, R.color.widget_accent);
            int secondary = ContextCompat.getColor(context, R.color.widget_text_secondary);
            views.setTextColor(R.id.person_counts, row.todayCount > 0 ? accent : secondary);

            Intent fillIn = new Intent();
            fillIn.setData(Uri.parse("donetick://chores"));
            views.setOnClickFillInIntent(R.id.person_root, fillIn);
            return views;
        }

        @Override
        public RemoteViews getLoadingView() {
            return null;
        }

        @Override
        public int getViewTypeCount() {
            return 3;
        }

        @Override
        public long getItemId(int position) {
            return position;
        }

        @Override
        public boolean hasStableIds() {
            return false;
        }

        @Override
        public int getCount() {
            return rows.size();
        }

        @Override
        public void onDestroy() {}
    }
}
