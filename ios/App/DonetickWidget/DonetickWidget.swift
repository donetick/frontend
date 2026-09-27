import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Palette

private func dynamicColor(light: UInt32, dark: UInt32) -> Color {
    func uiColor(_ hex: UInt32) -> UIColor {
        UIColor(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
    return Color(UIColor { trait in
        trait.userInterfaceStyle == .dark ? uiColor(dark) : uiColor(light)
    })
}

enum Palette {
    static let accent = dynamicColor(light: 0x0B6BCB, dark: 0x4B9BE8)
    static let accentSoft = dynamicColor(light: 0xE3EFFB, dark: 0x12395F)
    static let danger = dynamicColor(light: 0xC41C1C, dark: 0xF09898)
    static let warning = dynamicColor(light: 0xB26A00, dark: 0xF3C896)
    static let ringNeutral = dynamicColor(light: 0xB8C0C9, dark: 0x555E68)

    // Initials-disc colors; indexed by a stable hash of the member id so each
    // person keeps their color (mirror of AvatarCache.java).
    static let avatarColors: [Color] = [
        Color(red: 0x0B / 255, green: 0x6B / 255, blue: 0xCB / 255),
        Color(red: 0x14 / 255, green: 0x7D / 255, blue: 0x57 / 255),
        Color(red: 0x9C / 255, green: 0x4D / 255, blue: 0xD3 / 255),
        Color(red: 0xC2 / 255, green: 0x41 / 255, blue: 0x0C / 255),
        Color(red: 0x0E / 255, green: 0x74 / 255, blue: 0x90 / 255),
        Color(red: 0xB0 / 255, green: 0x2A / 255, blue: 0x5B / 255),
        Color(red: 0x5B / 255, green: 0x21 / 255, blue: 0xB6 / 255),
        Color(red: 0x93 / 255, green: 0x78 / 255, blue: 0x00 / 255),
    ]
}

// MARK: - Model

struct WidgetTask: Identifiable {
    let id: String
    let name: String
    let dueDate: Date?
    let priority: Int
    let approval: Bool
    let assignedTo: String?

    var overdue: Bool {
        guard !approval, let due = dueDate else { return false }
        return due < Date()
    }

    var deepLink: URL? {
        URL(string: "donetick://chores/\(id)")
    }
}

struct WidgetMember: Identifiable {
    let id: String
    let name: String
    let image: String?

    var color: Color {
        let hash = id.unicodeScalars.reduce(0) { $0 + Int($1.value) }
        return Palette.avatarColors[hash % Palette.avatarColors.count]
    }

    var initial: String {
        name.trimmingCharacters(in: .whitespaces).first.map(String.init)?.uppercased() ?? "?"
    }
}

// MARK: - Shared store (App Group)

enum WidgetStore {
    static let appGroup = "group.com.donetick.app"
    static let dataKey = "widget_tasks"
    static let configKey = "widget_config"

    // Same filtering window as src/service/WidgetService.js
    static let windowDays = 7
    static let maxTasks = 100
    static let staleInterval: TimeInterval = 10 * 60

    static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

    static var signedIn: Bool {
        defaults?.string(forKey: configKey) != nil
    }

    static var lastUpdated: Date? {
        guard let snapshot = snapshotDict(),
              let millis = snapshot["lastUpdated"] as? Double, millis > 0
        else { return nil }
        return Date(timeIntervalSince1970: millis / 1000)
    }

    static var userId: String? {
        guard let raw = defaults?.string(forKey: configKey),
              let data = raw.data(using: .utf8),
              let config = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let id = config["userId"]
        else { return nil }
        return "\(id)"
    }

    private static func snapshotDict() -> [String: Any]? {
        guard let raw = defaults?.string(forKey: dataKey),
              let data = raw.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return nil }
        return json
    }

    static func loadTasks() -> [WidgetTask] {
        guard let items = snapshotDict()?["tasks"] as? [[String: Any]] else { return [] }
        return items.compactMap { item in
            guard let rawId = item["id"] else { return nil }
            var dueDate: Date?
            if let millis = item["dueDate"] as? Double {
                dueDate = Date(timeIntervalSince1970: millis / 1000)
            }
            // v1 snapshots carried only the user's own tasks and had no
            // assignedTo — treat those rows as "mine".
            var assignedTo: String?
            if let raw = item["assignedTo"], !(raw is NSNull) {
                assignedTo = "\(raw)"
            } else if item.index(forKey: "assignedTo") == nil {
                assignedTo = userId
            }
            return WidgetTask(
                id: "\(rawId)",
                name: item["name"] as? String ?? "",
                dueDate: dueDate,
                priority: item["priority"] as? Int ?? 0,
                approval: item["approval"] as? Bool ?? false,
                assignedTo: assignedTo
            )
        }
    }

    static func loadMembers() -> [WidgetMember] {
        guard let items = snapshotDict()?["members"] as? [[String: Any]] else { return [] }
        return items.compactMap { item in
            guard let rawId = item["id"] else { return nil }
            return WidgetMember(
                id: "\(rawId)",
                name: item["name"] as? String ?? "",
                image: item["image"] as? String
            )
        }
    }

    /// Tasks a today/week widget should render: everything when includeOthers,
    /// otherwise the user's own tasks plus approvals (which wait on them).
    static func visibleTasks(_ tasks: [WidgetTask], includeOthers: Bool) -> [WidgetTask] {
        guard !includeOthers else { return tasks }
        let me = userId
        return tasks.filter { $0.approval || (me != nil && $0.assignedTo == me) }
    }

    /// Tasks the Today widget shows: awaiting approval, overdue, or due today.
    static func todaySubset(_ tasks: [WidgetTask]) -> [WidgetTask] {
        let endOfToday = endOfDay(daysFromNow: 0)
        return tasks.filter { $0.approval || ($0.dueDate.map { $0 <= endOfToday } ?? false) }
    }

    static func endOfDay(daysFromNow: Int) -> Date {
        let calendar = Calendar.current
        let day = calendar.date(byAdding: .day, value: daysFromNow, to: Date()) ?? Date()
        let start = calendar.startOfDay(for: day)
        return calendar.date(byAdding: DateComponents(day: 1, second: -1), to: start) ?? day
    }

    // MARK: Background refresh

    /// Re-fetch /chores/ when the app has not pushed a snapshot recently, so
    /// the widget stays current while the app is closed. On any failure the
    /// last snapshot stays; the UI shows staleness via "Updated …".
    static func refreshIfStale() async {
        if let updated = lastUpdated, Date().timeIntervalSince(updated) < staleInterval {
            return
        }
        guard let raw = defaults?.string(forKey: configKey),
              let configData = raw.data(using: .utf8),
              let config = try? JSONSerialization.jsonObject(with: configData) as? [String: Any],
              let serverUrl = config["serverUrl"] as? String,
              let token = config["token"] as? String,
              let url = URL(string: serverUrl + "/chores/")
        else { return }

        var request = URLRequest(url: url, timeoutInterval: 15)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        guard let (data, response) = try? await URLSession.shared.data(for: request),
              (response as? HTTPURLResponse)?.statusCode == 200,
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let chores = json["res"] as? [[String: Any]]
        else { return }

        // The chores endpoint has no member profiles, so carry the member
        // list over from the previous snapshot (it changes rarely and the
        // app re-pushes it on every open).
        let members = snapshotDict()?["members"] ?? [[String: Any]]()

        let snapshot: [String: Any] = [
            "version": 2,
            "lastUpdated": Date().timeIntervalSince1970 * 1000,
            "tasks": filterChores(chores),
            "members": members,
        ]
        if let encoded = try? JSONSerialization.data(withJSONObject: snapshot),
           let string = String(data: encoded, encoding: .utf8) {
            defaults?.set(string, forKey: dataKey)
        }
    }

    /// Mirror of buildWidgetTasks in src/service/WidgetService.js.
    private static func filterChores(_ chores: [[String: Any]]) -> [[String: Any]] {
        let cutoff = endOfDay(daysFromNow: windowDays)

        var selected: [[String: Any]] = []
        for chore in chores {
            guard let id = chore["id"] else { continue }
            let approval = (chore["status"] as? Int ?? 0) == 3
            let dueDate = parseDate(chore["nextDueDate"] as? String)
            let inWindow = dueDate != nil && dueDate! <= cutoff
            guard approval || inWindow else { continue }

            var task: [String: Any] = [
                "id": id,
                "name": chore["name"] as? String ?? "",
                "priority": chore["priority"] as? Int ?? 0,
                "approval": approval,
            ]
            task["dueDate"] = dueDate.map { $0.timeIntervalSince1970 * 1000 } ?? NSNull()
            if let assignee = chore["assignedTo"], !(assignee is NSNull) {
                task["assignedTo"] = "\(assignee)"
            } else {
                task["assignedTo"] = NSNull()
            }
            selected.append(task)
        }

        selected.sort { a, b in
            let aApproval = a["approval"] as? Bool ?? false
            let bApproval = b["approval"] as? Bool ?? false
            if aApproval != bApproval { return aApproval }
            let aDue = a["dueDate"] as? Double ?? .greatestFiniteMagnitude
            let bDue = b["dueDate"] as? Double ?? .greatestFiniteMagnitude
            return aDue < bDue
        }
        return Array(selected.prefix(maxTasks))
    }

    private static func parseDate(_ value: String?) -> Date? {
        guard let value = value, !value.isEmpty else { return nil }
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) { return date }
        return ISO8601DateFormatter().date(from: value)
    }
}

// MARK: - Avatars

/// Downloads member profile photos and caches them in the App Group container
/// for a day. Members without a photo (or failed downloads) render as colored
/// initials discs instead — see AvatarView.
enum AvatarStore {
    private static let maxAge: TimeInterval = 24 * 60 * 60
    private static let sizePx: CGFloat = 96

    private static var cacheDir: URL? {
        FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: WidgetStore.appGroup)?
            .appendingPathComponent("widget_avatars", isDirectory: true)
    }

    static func loadAll(_ members: [WidgetMember]) async -> [String: UIImage] {
        var images: [String: UIImage] = [:]
        for member in members {
            if let image = await load(member) {
                images[member.id] = image
            }
        }
        return images
    }

    private static func load(_ member: WidgetMember) async -> UIImage? {
        guard let urlString = member.image, urlString.hasPrefix("http"),
              let url = URL(string: urlString), let dir = cacheDir
        else { return nil }

        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let file = dir.appendingPathComponent("\(member.id).png")

        if let attrs = try? FileManager.default.attributesOfItem(atPath: file.path),
           let modified = attrs[.modificationDate] as? Date,
           Date().timeIntervalSince(modified) < maxAge,
           let cached = UIImage(contentsOfFile: file.path) {
            return cached
        }

        guard let (data, response) = try? await URLSession.shared.data(from: url),
              (response as? HTTPURLResponse)?.statusCode == 200,
              let raw = UIImage(data: data)
        else {
            // Keep serving a stale copy rather than nothing.
            return UIImage(contentsOfFile: file.path)
        }

        let scaled = downscale(raw)
        if let png = scaled.pngData() {
            try? png.write(to: file)
        }
        return scaled
    }

    private static func downscale(_ image: UIImage) -> UIImage {
        let size = CGSize(width: sizePx, height: sizePx)
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: size))
        }
    }
}

// MARK: - Configuration intent (long-press → Edit Widget)

struct WidgetOptionsIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Widget Options"
    static var description = IntentDescription("Choose whose tasks the widget shows.")

    @Parameter(title: "Show everyone's tasks", default: false)
    var includeOthers: Bool
}

// MARK: - Timeline

struct TaskEntry: TimelineEntry {
    let date: Date
    let tasks: [WidgetTask]
    let members: [WidgetMember]
    let avatars: [String: UIImage]
    let lastUpdated: Date?
    let signedIn: Bool
    let includeOthers: Bool
    let myUserId: String?

    static func sample() -> TaskEntry {
        let calendar = Calendar.current
        let today = calendar.date(bySettingHour: 18, minute: 0, second: 0, of: Date())!
        return TaskEntry(
            date: Date(),
            tasks: [
                WidgetTask(id: "1", name: "Take out the trash", dueDate: today, priority: 1, approval: false, assignedTo: "1"),
                WidgetTask(id: "2", name: "Water the plants", dueDate: today, priority: 0, approval: false, assignedTo: "1"),
                WidgetTask(id: "3", name: "Vacuum living room", dueDate: calendar.date(byAdding: .day, value: 1, to: today), priority: 2, approval: false, assignedTo: "2"),
                WidgetTask(id: "4", name: "Clean the garage", dueDate: calendar.date(byAdding: .day, value: 3, to: today), priority: 0, approval: false, assignedTo: "1"),
            ],
            members: [
                WidgetMember(id: "1", name: "Alex", image: nil),
                WidgetMember(id: "2", name: "Sam", image: nil),
            ],
            avatars: [:],
            lastUpdated: Date(),
            signedIn: true,
            includeOthers: false,
            myUserId: "1"
        )
    }
}

private func makeEntry(includeOthers: Bool) async -> TaskEntry {
    await WidgetStore.refreshIfStale()
    let members = WidgetStore.loadMembers()
    let avatars = includeOthers ? await AvatarStore.loadAll(members) : [:]
    return TaskEntry(
        date: Date(),
        tasks: WidgetStore.loadTasks(),
        members: members,
        avatars: avatars,
        lastUpdated: WidgetStore.lastUpdated,
        signedIn: WidgetStore.signedIn,
        includeOthers: includeOthers,
        myUserId: WidgetStore.userId
    )
}

private func makeTimeline(includeOthers: Bool) async -> Timeline<TaskEntry> {
    Timeline(
        entries: [await makeEntry(includeOthers: includeOthers)],
        policy: .after(Date().addingTimeInterval(30 * 60))
    )
}

struct DonetickProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> TaskEntry {
        .sample()
    }

    func snapshot(for configuration: WidgetOptionsIntent, in context: Context) async -> TaskEntry {
        if context.isPreview { return .sample() }
        return await makeEntry(includeOthers: configuration.includeOthers)
    }

    func timeline(for configuration: WidgetOptionsIntent, in context: Context) async -> Timeline<TaskEntry> {
        await makeTimeline(includeOthers: configuration.includeOthers)
    }
}

/// The People widget always covers the whole circle, so it needs no intent.
struct PeopleProvider: TimelineProvider {
    func placeholder(in context: Context) -> TaskEntry {
        .sample()
    }

    func getSnapshot(in context: Context, completion: @escaping (TaskEntry) -> Void) {
        if context.isPreview {
            completion(.sample())
            return
        }
        Task { completion(await makeEntry(includeOthers: true)) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TaskEntry>) -> Void) {
        Task { completion(await makeTimeline(includeOthers: true)) }
    }
}

// MARK: - Formatting helpers

private let timeFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.timeStyle = .short
    formatter.dateStyle = .none
    return formatter
}()

private let dayFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.setLocalizedDateFormatFromTemplate("EEEMMMd")
    return formatter
}()

private func dayLabel(for date: Date) -> String {
    let calendar = Calendar.current
    if calendar.isDateInToday(date) { return "Today" }
    if calendar.isDateInTomorrow(date) { return "Tomorrow" }
    if date < calendar.startOfDay(for: Date()) { return "Overdue" }
    return dayFormatter.string(from: date)
}

private let addTaskURL = URL(string: "donetick://chores/add")

// MARK: - Shared views

extension View {
    func widgetShell() -> some View {
        containerBackground(for: .widget) { Color(UIColor.systemBackground) }
    }
}

struct AvatarView: View {
    let member: WidgetMember
    let image: UIImage?
    var size: CGFloat = 18

    var body: some View {
        if let image = image {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
                .frame(width: size, height: size)
                .clipShape(Circle())
        } else {
            ZStack {
                Circle().fill(member.color)
                Text(member.initial)
                    .font(.system(size: size * 0.48, weight: .bold))
                    .foregroundColor(.white)
            }
            .frame(width: size, height: size)
        }
    }
}

struct TaskRow: View {
    let task: WidgetTask
    var showDay = false
    var assignee: WidgetMember?
    var assigneeImage: UIImage?

    private var ringColor: Color {
        if task.approval { return Palette.warning }
        if task.overdue || task.priority == 1 { return Palette.danger }
        if task.priority == 2 { return Palette.warning }
        return Palette.ringNeutral
    }

    private var meta: (text: String, color: Color) {
        if task.approval { return ("Approve", Palette.warning) }
        guard let due = task.dueDate else { return ("", .secondary) }
        if task.overdue { return ("Overdue", Palette.danger) }
        if showDay && !Calendar.current.isDateInToday(due) {
            return (dayLabel(for: due), .secondary)
        }
        return (timeFormatter.string(from: due), .secondary)
    }

    var body: some View {
        let row = HStack(spacing: 9) {
            Circle()
                .strokeBorder(ringColor, lineWidth: 2)
                .frame(width: 15, height: 15)
            Text(task.name)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.primary)
                .lineLimit(1)
            Spacer(minLength: 6)
            Text(meta.text)
                .font(.system(size: 11))
                .foregroundColor(meta.color)
            if let assignee = assignee {
                AvatarView(member: assignee, image: assigneeImage)
            }
        }
        .frame(minHeight: 22)

        if let url = task.deepLink {
            Link(destination: url) { row }
        } else {
            row
        }
    }
}

struct WidgetHeader: View {
    let title: String
    let count: Int
    let lastUpdated: Date?
    var showAdd = false

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 6) {
                Text(title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.primary)
                Spacer()
                if count > 0 {
                    Text("\(count)")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Palette.accent)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 2)
                        .background(Palette.accentSoft)
                        .clipShape(Capsule())
                }
                if showAdd, let url = addTaskURL {
                    Link(destination: url) {
                        Image(systemName: "plus")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Palette.accent)
                            .frame(width: 22, height: 22)
                            .background(Palette.accentSoft)
                            .clipShape(Circle())
                    }
                }
            }
            Text(subtitle)
                .font(.system(size: 10))
                .foregroundColor(.secondary)
        }
    }

    private var subtitle: String {
        let date = dayFormatter.string(from: Date())
        guard let updated = lastUpdated else { return date }
        return "\(date) · Updated \(timeFormatter.string(from: updated))"
    }
}

struct StateMessage: View {
    let systemImage: String
    let title: String
    let detail: String

    var body: some View {
        VStack(spacing: 5) {
            Image(systemName: systemImage)
                .font(.system(size: 22))
                .foregroundColor(Palette.accent)
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.primary)
            Text(detail)
                .font(.system(size: 11))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private extension TaskEntry {
    /// Tasks this widget instance shows, respecting its includeOthers option.
    var visibleTasks: [WidgetTask] {
        WidgetStore.visibleTasks(tasks, includeOthers: includeOthers)
    }

    /// Assignee decoration for a row — only in "everyone" mode, and only for
    /// tasks that are someone else's (own tasks stay clean).
    func assignee(for task: WidgetTask) -> WidgetMember? {
        guard includeOthers, let owner = task.assignedTo, owner != myUserId else { return nil }
        return members.first { $0.id == owner }
    }
}

// MARK: - Today widget

struct TodayWidgetView: View {
    let entry: TaskEntry
    @Environment(\.widgetFamily) private var family

    private var tasks: [WidgetTask] { WidgetStore.todaySubset(entry.visibleTasks) }

    var body: some View {
        if !entry.signedIn {
            StateMessage(
                systemImage: "person.crop.circle.badge.exclamationmark",
                title: "Sign in",
                detail: "Open Donetick to see your tasks"
            )
        } else if family == .systemSmall {
            smallView
        } else if tasks.isEmpty {
            VStack(alignment: .leading, spacing: 0) {
                WidgetHeader(title: "Today", count: 0, lastUpdated: entry.lastUpdated, showAdd: true)
                StateMessage(
                    systemImage: "checkmark.circle",
                    title: "All caught up!",
                    detail: "Nothing due today"
                )
            }
        } else {
            listView
        }
    }

    private var smallView: some View {
        let overdueCount = tasks.filter(\.overdue).count
        return VStack(alignment: .leading, spacing: 2) {
            Text("Today")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.secondary)
            Text("\(tasks.count)")
                .font(.system(size: 40, weight: .bold, design: .rounded))
                .foregroundColor(tasks.isEmpty ? .secondary : Palette.accent)
            Text(tasks.isEmpty ? "all caught up" : (tasks.count == 1 ? "task left" : "tasks left"))
                .font(.system(size: 12))
                .foregroundColor(.secondary)
            Spacer(minLength: 2)
            if overdueCount > 0 {
                Text("\(overdueCount) overdue")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Palette.danger)
            } else if let first = tasks.first {
                Text(first.name)
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            } else if let updated = entry.lastUpdated {
                Text("Updated \(timeFormatter.string(from: updated))")
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "donetick://chores"))
    }

    private var listView: some View {
        let limit = family == .systemLarge ? 9 : 3
        let visible = Array(tasks.prefix(limit))
        let remaining = tasks.count - visible.count

        return VStack(alignment: .leading, spacing: 4) {
            WidgetHeader(title: "Today", count: tasks.count, lastUpdated: entry.lastUpdated, showAdd: true)
            Spacer(minLength: 2)
            ForEach(visible) { task in
                TaskRow(
                    task: task,
                    assignee: entry.assignee(for: task),
                    assigneeImage: task.assignedTo.flatMap { entry.avatars[$0] }
                )
            }
            if remaining > 0 {
                Text("+\(remaining) more")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.secondary)
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct TodayWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: "DonetickTodayWidget",
            intent: WidgetOptionsIntent.self,
            provider: DonetickProvider()
        ) { entry in
            TodayWidgetView(entry: entry).widgetShell()
        }
        .configurationDisplayName("Today")
        .description("Tasks due today, plus anything waiting on you.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Next 7 days widget

struct WeekWidgetView: View {
    let entry: TaskEntry
    @Environment(\.widgetFamily) private var family

    private var tasks: [WidgetTask] { entry.visibleTasks }

    private enum WeekRow: Identifiable {
        case header(String)
        case task(WidgetTask)

        var id: String {
            switch self {
            case .header(let label): return "header-\(label)"
            case .task(let task): return "task-\(task.id)"
            }
        }
    }

    var body: some View {
        if !entry.signedIn {
            StateMessage(
                systemImage: "person.crop.circle.badge.exclamationmark",
                title: "Sign in",
                detail: "Open Donetick to see your tasks"
            )
        } else if tasks.isEmpty {
            VStack(alignment: .leading, spacing: 0) {
                WidgetHeader(title: "Next 7 days", count: 0, lastUpdated: entry.lastUpdated)
                StateMessage(
                    systemImage: "checkmark.circle",
                    title: "All caught up!",
                    detail: "Nothing due this week"
                )
            }
        } else if family == .systemMedium {
            compactView
        } else {
            groupedView
        }
    }

    // Medium: flat rows with the day in the meta column.
    private var compactView: some View {
        let visible = Array(tasks.prefix(3))
        let remaining = tasks.count - visible.count

        return VStack(alignment: .leading, spacing: 4) {
            WidgetHeader(title: "Next 7 days", count: tasks.count, lastUpdated: entry.lastUpdated)
            Spacer(minLength: 2)
            ForEach(visible) { task in
                TaskRow(
                    task: task,
                    showDay: true,
                    assignee: entry.assignee(for: task),
                    assigneeImage: task.assignedTo.flatMap { entry.avatars[$0] }
                )
            }
            if remaining > 0 {
                Text("+\(remaining) more")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.secondary)
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    // Large: rows grouped under day headers.
    private var groupedView: some View {
        var rows: [WeekRow] = []
        var currentGroup: String?

        let approvals = tasks.filter(\.approval)
        if !approvals.isEmpty {
            rows.append(.header("Needs approval"))
            rows.append(contentsOf: approvals.map(WeekRow.task))
        }
        for task in tasks where !task.approval {
            guard let due = task.dueDate else { continue }
            let group = dayLabel(for: due)
            if group != currentGroup {
                rows.append(.header(group))
                currentGroup = group
            }
            rows.append(.task(task))
        }

        let visible = Array(rows.prefix(12))
        let remainingTasks = rows.dropFirst(12).filter {
            if case .task = $0 { return true }
            return false
        }.count

        return VStack(alignment: .leading, spacing: 3) {
            WidgetHeader(title: "Next 7 days", count: tasks.count, lastUpdated: entry.lastUpdated)
            Spacer(minLength: 2)
            ForEach(visible) { row in
                switch row {
                case .header(let label):
                    Text(label.uppercased())
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.secondary)
                        .kerning(0.8)
                        .padding(.top, 3)
                case .task(let task):
                    TaskRow(
                        task: task,
                        assignee: entry.assignee(for: task),
                        assigneeImage: task.assignedTo.flatMap { entry.avatars[$0] }
                    )
                }
            }
            if remainingTasks > 0 {
                Text("+\(remainingTasks) more")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.secondary)
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct WeekWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: "DonetickWeekWidget",
            intent: WidgetOptionsIntent.self,
            provider: DonetickProvider()
        ) { entry in
            WeekWidgetView(entry: entry).widgetShell()
        }
        .configurationDisplayName("Next 7 Days")
        .description("Tasks for the next 7 days, grouped by day.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// MARK: - People widget

private struct PersonLoad: Identifiable {
    let member: WidgetMember
    let todayCount: Int
    let weekCount: Int

    var id: String { member.id }
}

struct PeopleWidgetView: View {
    let entry: TaskEntry
    @Environment(\.widgetFamily) private var family

    private var people: [PersonLoad] {
        let todayTasks = WidgetStore.todaySubset(entry.tasks)
        return entry.members
            .map { member in
                PersonLoad(
                    member: member,
                    todayCount: todayTasks.filter { $0.assignedTo == member.id }.count,
                    weekCount: entry.tasks.filter { $0.assignedTo == member.id }.count
                )
            }
            .sorted { a, b in
                if a.todayCount != b.todayCount { return a.todayCount > b.todayCount }
                if a.weekCount != b.weekCount { return a.weekCount > b.weekCount }
                return a.member.name.localizedCaseInsensitiveCompare(b.member.name) == .orderedAscending
            }
    }

    var body: some View {
        if !entry.signedIn {
            StateMessage(
                systemImage: "person.crop.circle.badge.exclamationmark",
                title: "Sign in",
                detail: "Open Donetick to see your circle"
            )
        } else if entry.members.isEmpty {
            VStack(alignment: .leading, spacing: 0) {
                WidgetHeader(title: "People", count: 0, lastUpdated: entry.lastUpdated)
                StateMessage(
                    systemImage: "person.2",
                    title: "No members yet",
                    detail: "Invite your circle in Donetick"
                )
            }
        } else if family == .systemMedium {
            mediumView
        } else {
            largeView
        }
    }

    // Medium: up to four members side by side, avatar first.
    private var mediumView: some View {
        let visible = Array(people.prefix(4))
        return VStack(alignment: .leading, spacing: 6) {
            WidgetHeader(title: "People", count: 0, lastUpdated: entry.lastUpdated)
            Spacer(minLength: 2)
            HStack(alignment: .top, spacing: 0) {
                ForEach(visible) { person in
                    VStack(spacing: 3) {
                        AvatarView(
                            member: person.member,
                            image: entry.avatars[person.member.id],
                            size: 34
                        )
                        Text(person.member.name)
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.primary)
                            .lineLimit(1)
                        Text("\(person.todayCount) today")
                            .font(.system(size: 9, weight: person.todayCount > 0 ? .bold : .regular))
                            .foregroundColor(person.todayCount > 0 ? Palette.accent : .secondary)
                        Text("\(person.weekCount) this week")
                            .font(.system(size: 9))
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    // Large: one row per member.
    private var largeView: some View {
        let visible = Array(people.prefix(9))
        return VStack(alignment: .leading, spacing: 4) {
            WidgetHeader(title: "People", count: 0, lastUpdated: entry.lastUpdated)
            Spacer(minLength: 2)
            ForEach(visible) { person in
                HStack(spacing: 9) {
                    AvatarView(
                        member: person.member,
                        image: entry.avatars[person.member.id],
                        size: 26
                    )
                    Text(person.member.name)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                    Spacer(minLength: 6)
                    Text("\(person.todayCount) today · \(person.weekCount) this week")
                        .font(.system(size: 11))
                        .foregroundColor(person.todayCount > 0 ? Palette.accent : .secondary)
                }
                .frame(minHeight: 28)
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct PeopleWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DonetickPeopleWidget", provider: PeopleProvider()) { entry in
            PeopleWidgetView(entry: entry).widgetShell()
        }
        .configurationDisplayName("People")
        .description("Everyone in your circle with their tasks for today and the week ahead.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// MARK: - Quick Capture widget

/// One of the three ways into the add-task flow. Purely a launcher — the
/// destinations are handled in src/CapacitorListener.js.
private struct QuickCaptureAction: Identifiable {
    let id: String
    let title: String
    let systemImage: String
    let url: URL?

    static let all: [QuickCaptureAction] = [
        QuickCaptureAction(
            id: "type",
            title: "Type",
            systemImage: "plus",
            url: URL(string: "donetick://chores/add")
        ),
        QuickCaptureAction(
            id: "scan",
            title: "Scan",
            systemImage: "doc.viewfinder",
            url: URL(string: "donetick://chores/add?mode=scan")
        ),
        QuickCaptureAction(
            id: "voice",
            title: "Speak",
            systemImage: "mic.fill",
            url: URL(string: "donetick://chores/add?mode=voice")
        ),
    ]
}

private struct QuickCaptureTile: View {
    let action: QuickCaptureAction

    var body: some View {
        let tile = VStack(spacing: 5) {
            Image(systemName: action.systemImage)
                .font(.system(size: 22, weight: .medium))
                .foregroundColor(Palette.accent)
            Text(action.title)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Palette.accent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.accentSoft)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

        if let url = action.url {
            Link(destination: url) { tile }
        } else {
            tile
        }
    }
}

struct QuickCaptureEntry: TimelineEntry {
    let date: Date
}

/// Static content — one entry, never reloaded.
struct QuickCaptureProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuickCaptureEntry {
        QuickCaptureEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (QuickCaptureEntry) -> Void) {
        completion(QuickCaptureEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<QuickCaptureEntry>) -> Void) {
        completion(Timeline(entries: [QuickCaptureEntry(date: Date())], policy: .never))
    }
}

struct QuickCaptureWidgetView: View {
    var body: some View {
        HStack(spacing: 8) {
            ForEach(QuickCaptureAction.all) { action in
                QuickCaptureTile(action: action)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct QuickCaptureWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DonetickQuickCaptureWidget", provider: QuickCaptureProvider()) { _ in
            QuickCaptureWidgetView().widgetShell()
        }
        .configurationDisplayName("Quick Capture")
        .description("Capture a task in one tap — type it, scan it, or say it.")
        // Medium only: systemSmall gives the whole widget a single tap target,
        // which can't carry three separate destinations.
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Bundle

@main
struct DonetickWidgetBundle: WidgetBundle {
    var body: some Widget {
        TodayWidget()
        WeekWidget()
        PeopleWidget()
        QuickCaptureWidget()
    }
}
