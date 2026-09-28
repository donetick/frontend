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

private func priorityRank(_ priority: Int) -> Int {
    (1...4).contains(priority) ? priority - 1 : 4
}

private func projectTaskComesFirst(_ a: WidgetProjectTask, _ b: WidgetProjectTask) -> Bool {
    switch (a.dueDate, b.dueDate) {
    case let (aDate?, bDate?) where aDate != bDate:
        return aDate < bDate
    case (_?, nil):
        return true
    case (nil, _?):
        return false
    default:
        return priorityRank(a.priority) < priorityRank(b.priority)
    }
}

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

struct WidgetProjectTask: Identifiable {
    let id: String
    let name: String
    let projectId: String
    let assignedTo: String?
    let completed: Bool
    let dueDate: Date?
    let priority: Int
}

struct WidgetProject: Identifiable {
    let id: String
    let name: String
    let color: String
    let icon: String?
}

struct WidgetFilterTask: Identifiable {
    let id: String
    let name: String
    let filterId: String
    let assignedTo: String?
    let completed: Bool
    let dueDate: Date?
    let priority: Int
}

struct WidgetFilter: Identifiable {
    let id: String
    let name: String
    let color: String
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
    static let projectIndexKey = "project_widget_index"
    static let projectPageKey = "project_widget_page"
    static let filterIndexKey = "filter_widget_index"
    static let filterPageKey = "filter_widget_page"
    static let projectRefreshingKey = "project_widget_refreshing"
    static let filterRefreshingKey = "filter_widget_refreshing"

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

    static func loadProjects() -> [WidgetProject] {
        guard let items = snapshotDict()?["projects"] as? [[String: Any]] else { return [] }
        return items.compactMap { item in
            guard let rawId = item["id"] else { return nil }
            return WidgetProject(
                id: "\(rawId)",
                name: item["name"] as? String ?? "Project",
                color: item["color"] as? String ?? "#64748B",
                icon: item["icon"] as? String
            )
        }
    }

    static func loadFilters() -> [WidgetFilter] {
        guard let items = snapshotDict()?["filters"] as? [[String: Any]] else { return [] }
        return items.compactMap { item in
            guard let rawId = item["id"] else { return nil }
            return WidgetFilter(
                id: "\(rawId)",
                name: item["name"] as? String ?? "Filter",
                color: item["color"] as? String ?? "#64748B"
            )
        }
    }

    static func loadFilterTasks() -> [WidgetFilterTask] {
        guard let items = snapshotDict()?["filterTasks"] as? [[String: Any]] else { return [] }
        return items.compactMap { item in
            guard let rawId = item["id"] else { return nil }
            return WidgetFilterTask(
                id: "\(rawId)",
                name: item["name"] as? String ?? "",
                filterId: item["filterId"] as? String ?? "",
                assignedTo: item["assignedTo"].flatMap { $0 is NSNull ? nil : "\($0)" },
                completed: item["completed"] as? Bool ?? false,
                dueDate: (item["dueDate"] as? Double).map {
                    Date(timeIntervalSince1970: $0 / 1000)
                },
                priority: item["priority"] as? Int ?? 0
            )
        }.sorted {
            switch ($0.dueDate, $1.dueDate) {
            case let (a?, b?) where a != b: return a < b
            case (_?, nil): return true
            case (nil, _?): return false
            default: return priorityRank($0.priority) < priorityRank($1.priority)
            }
        }
    }

    static func loadProjectTasks() -> [WidgetProjectTask] {
        guard let items = snapshotDict()?["projectTasks"] as? [[String: Any]] else { return [] }
        return items.compactMap { item in
            guard let rawId = item["id"] else { return nil }
            let assignee = item["assignedTo"].flatMap { $0 is NSNull ? nil : "\($0)" }
            return WidgetProjectTask(
                id: "\(rawId)",
                name: item["name"] as? String ?? "",
                projectId: item["projectId"] as? String ?? "default",
                assignedTo: assignee,
                completed: item["completed"] as? Bool ?? false,
                dueDate: (item["dueDate"] as? Double).map {
                    Date(timeIntervalSince1970: $0 / 1000)
                },
                priority: item["priority"] as? Int ?? 0
            )
        }.sorted(by: projectTaskComesFirst)
    }

    static var projectIndex: Int {
        get { max(0, defaults?.integer(forKey: projectIndexKey) ?? 0) }
        set { defaults?.set(max(0, newValue), forKey: projectIndexKey) }
    }

    static var projectPage: Int {
        get { max(0, defaults?.integer(forKey: projectPageKey) ?? 0) }
        set { defaults?.set(max(0, newValue), forKey: projectPageKey) }
    }

    static var filterIndex: Int {
        get { max(0, defaults?.integer(forKey: filterIndexKey) ?? 0) }
        set { defaults?.set(max(0, newValue), forKey: filterIndexKey) }
    }

    static var filterPage: Int {
        get { max(0, defaults?.integer(forKey: filterPageKey) ?? 0) }
        set { defaults?.set(max(0, newValue), forKey: filterPageKey) }
    }

    static var projectRefreshing: Bool {
        get { Date().timeIntervalSince1970 - (defaults?.double(forKey: projectRefreshingKey) ?? 0) < 30 }
        set {
            if newValue { defaults?.set(Date().timeIntervalSince1970, forKey: projectRefreshingKey) }
            else { defaults?.removeObject(forKey: projectRefreshingKey) }
        }
    }

    static var filterRefreshing: Bool {
        get { Date().timeIntervalSince1970 - (defaults?.double(forKey: filterRefreshingKey) ?? 0) < 30 }
        set {
            if newValue { defaults?.set(Date().timeIntervalSince1970, forKey: filterRefreshingKey) }
            else { defaults?.removeObject(forKey: filterRefreshingKey) }
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
    static func refreshIfStale(force: Bool = false) async {
        if !force, let updated = lastUpdated, Date().timeIntervalSince(updated) < staleInterval {
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
        let projects = snapshotDict()?["projects"] ?? [[String: Any]]()
        let filters = snapshotDict()?["filters"] as? [[String: Any]] ?? []

        let snapshot: [String: Any] = [
            "version": 4,
            "lastUpdated": Date().timeIntervalSince1970 * 1000,
            "tasks": filterChores(chores),
            "projectTasks": projectTasks(chores),
            "projects": projects,
            "filterTasks": filterTasks(chores, filters: filters, userId: userId),
            "filters": filters,
            "members": members,
        ]
        if let encoded = try? JSONSerialization.data(withJSONObject: snapshot),
           let string = String(data: encoded, encoding: .utf8) {
            defaults?.set(string, forKey: dataKey)
        }
    }

    static func setProjectTaskCompleted(id: String, completed: Bool) {
        guard var snapshot = snapshotDict(),
              var tasks = snapshot["projectTasks"] as? [[String: Any]] else { return }
        for index in tasks.indices where "\(tasks[index]["id"] ?? "")" == id {
            tasks[index]["completed"] = completed
        }
        snapshot["projectTasks"] = tasks
        if var filterTasks = snapshot["filterTasks"] as? [[String: Any]] {
            for index in filterTasks.indices where "\(filterTasks[index]["id"] ?? "")" == id {
                filterTasks[index]["completed"] = completed
            }
            snapshot["filterTasks"] = filterTasks
        }
        if let encoded = try? JSONSerialization.data(withJSONObject: snapshot),
           let string = String(data: encoded, encoding: .utf8) {
            defaults?.set(string, forKey: dataKey)
        }
    }

    static func completeTask(id: String) async -> Bool {
        guard let raw = defaults?.string(forKey: configKey),
              let configData = raw.data(using: .utf8),
              let config = try? JSONSerialization.jsonObject(with: configData) as? [String: Any],
              let serverUrl = config["serverUrl"] as? String,
              let token = config["token"] as? String,
              let url = URL(string: serverUrl + "/chores/\(id)/do")
        else { return false }

        var request = URLRequest(url: url, timeoutInterval: 15)
        request.httpMethod = "POST"
        request.httpBody = Data("null".utf8)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        guard let (_, response) = try? await URLSession.shared.data(for: request),
              let status = (response as? HTTPURLResponse)?.statusCode,
              (200..<300).contains(status)
        else { return false }

        setProjectTaskCompleted(id: id, completed: true)
        return true
    }

    private static func filterTasks(_ chores: [[String: Any]], filters: [[String: Any]],
                                    userId: String?) -> [[String: Any]] {
        filters.flatMap { filter -> [[String: Any]] in
            guard let rawFilterId = filter["id"] else { return [] }
            return chores.filter { matchesFilter($0, filter: filter, userId: userId) }
                .prefix(100)
                .compactMap { chore in
                    guard let id = chore["id"] else { return nil }
                    return [
                        "id": id,
                        "name": chore["name"] as? String ?? "",
                        "filterId": "\(rawFilterId)",
                        "assignedTo": chore["assignedTo"] ?? NSNull(),
                        "completed": false,
                        "dueDate": parseDate(chore["nextDueDate"] as? String)
                            .map { ($0.timeIntervalSince1970 * 1000) as Any } ?? NSNull(),
                        "priority": chore["priority"] as? Int ?? 0,
                    ]
                }
        }
    }

    private static func matchesFilter(_ chore: [String: Any], filter: [String: Any],
                                      userId: String?) -> Bool {
        guard let conditions = filter["conditions"] as? [[String: Any]], !conditions.isEmpty
        else { return true }
        let matches = conditions.map { matchesCondition(chore, condition: $0, userId: userId) }
        return (filter["operator"] as? String)?.uppercased() == "OR"
            ? matches.contains(true) : !matches.contains(false)
    }

    private static func values(_ value: Any?) -> [Any] {
        if let array = value as? [Any] { return array }
        return value.map { [$0] } ?? []
    }

    private static func stringId(_ value: Any?) -> String? {
        guard let value, !(value is NSNull) else { return nil }
        return "\(value)"
    }

    private static func number(_ value: Any?) -> Double? {
        if let number = value as? NSNumber { return number.doubleValue }
        return stringId(value).flatMap(Double.init)
    }

    private static func containsId(_ items: Any?, id: String, key: String) -> Bool {
        (items as? [[String: Any]])?.contains { stringId($0[key]) == id } ?? false
    }

    private static func matchesCondition(_ chore: [String: Any], condition: [String: Any],
                                         userId: String?) -> Bool {
        let type = condition["type"] as? String ?? ""
        let op = condition["operator"] as? String ?? ""
        let entries = values(condition["value"])
        var matched = false
        switch type {
        case "assignee":
            let assigned = stringId(chore["assignedTo"])
            matched = entries.contains { entry in
                let value = stringId(entry) ?? ""
                if value == "anyone" { return true }
                if value == "available_for_me" { return userId != nil && (assigned == nil || assigned == userId) }
                if value == "others" { return userId != nil && assigned != userId
                    && !containsId(chore["assignees"], id: userId!, key: "userId") }
                let expected = value == "me" ? userId : value
                return expected != nil && (assigned == expected
                    || containsId(chore["assignees"], id: expected!, key: "userId"))
            }
            return op == "is" ? matched : !matched
        case "createdBy":
            let creator = stringId(chore["createdBy"])
            matched = entries.contains { (stringId($0) == "me" ? userId : stringId($0)) == creator }
            return op == "is" ? matched : !matched
        case "priority", "status":
            let actual = number(chore[type]) ?? 0
            matched = entries.contains { number($0) == actual }
            if op == "is" { return matched }
            if op == "isNot" { return !matched }
            guard let target = number(condition["value"]) else { return false }
            return op == "greaterThan" ? actual > target : op == "lessThan" && actual < target
        case "points":
            let actual = number(chore["points"]) ?? 0
            guard let target = number(condition["value"]) else { return false }
            switch op {
            case "equals": return actual == target
            case "greaterThan": return actual > target
            case "lessThan": return actual < target
            case "greaterThanOrEqual": return actual >= target
            case "lessThanOrEqual": return actual <= target
            default: return false
            }
        case "label":
            matched = entries.contains { entry in
                stringId(entry).map { containsId(chore["labelsV2"], id: $0, key: "id") } ?? false
            }
            return ["has", "is"].contains(op) ? matched : !matched
        case "project":
            let projectId = stringId(chore["projectId"] ?? chore["project_id"])
                .flatMap { $0.isEmpty ? nil : $0 } ?? "default"
            matched = entries.contains { stringId($0) == projectId }
            return op == "is" ? matched : !matched
        case "dueDate":
            return matchesDueDate(parseDate(chore["nextDueDate"] as? String), operator: op,
                                  value: condition["value"])
        default:
            return true
        }
    }

    private static func matchesDueDate(_ due: Date?, operator op: String, value: Any?) -> Bool {
        if op == "anyOf" {
            return values(value).contains { matchesDueDate(due, operator: stringId($0) ?? "", value: nil) }
        }
        if op == "hasNoDueDate" { return due == nil }
        if op == "hasDueDate" { return due != nil }
        guard let due else { return false }
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        switch op {
        case "isOverdue": return due < Date()
        case "isDueToday": return calendar.isDateInToday(due)
        case "isDueTomorrow": return calendar.isDateInTomorrow(due)
        case "isDueThisWeek": return due >= today && due < calendar.date(byAdding: .day, value: 7, to: today)!
        case "isDueThisMonth": return calendar.isDate(due, equalTo: today, toGranularity: .month)
        case "before", "after":
            let target = stringId(value) == "today" ? today : parseDate(stringId(value))
            guard let target else { return false }
            return op == "before" ? due < target : due > target
        case "between":
            let range = values(value)
            guard range.count == 2, let start = parseDate(stringId(range[0])),
                  let end = parseDate(stringId(range[1])) else { return false }
            return due >= start && due <= end
        default: return false
        }
    }

    private static func projectTasks(_ chores: [[String: Any]]) -> [[String: Any]] {
        chores.prefix(500).compactMap { chore in
            guard let id = chore["id"] else { return nil }
            let rawProject = chore["projectId"] ?? chore["project_id"] ?? "default"
            let projectId = "\(rawProject)".isEmpty ? "default" : "\(rawProject)"
            return [
                "id": id,
                "name": chore["name"] as? String ?? "",
                "projectId": projectId,
                "assignedTo": chore["assignedTo"] ?? NSNull(),
                "completed": false,
                "dueDate": parseDate(chore["nextDueDate"] as? String)
                    .map { ($0.timeIntervalSince1970 * 1000) as Any } ?? NSNull(),
                "priority": chore["priority"] as? Int ?? 0,
            ]
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
            if aDue != bDue { return aDue < bDue }
            let aPriority = priorityRank(a["priority"] as? Int ?? 0)
            let bPriority = priorityRank(b["priority"] as? Int ?? 0)
            return aPriority < bPriority
        }
        return Array(selected.prefix(maxTasks))
    }

    private static func parseDate(_ value: String?) -> Date? {
        guard let value = value, !value.isEmpty else { return nil }
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) { return date }
        if let date = ISO8601DateFormatter().date(from: value) { return date }
        let day = DateFormatter()
        day.locale = Locale(identifier: "en_US_POSIX")
        day.dateFormat = "yyyy-MM-dd"
        return day.date(from: value)
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

private let projectWidgetKind = "DonetickProjectWidget"
private let filterWidgetKind = "DonetickFilterWidget"
private let projectPageSize = 5
private let filterPageSize = 5

private func moveProject(_ delta: Int) {
    let count = WidgetStore.loadProjects().count
    guard count > 0 else { return }
    WidgetStore.projectIndex = (WidgetStore.projectIndex + delta + count) % count
    WidgetStore.projectPage = 0
    WidgetCenter.shared.reloadTimelines(ofKind: projectWidgetKind)
}

struct PreviousProjectIntent: AppIntent {
    static var title: LocalizedStringResource = "Previous Project"
    func perform() async throws -> some IntentResult { moveProject(-1); return .result() }
}

struct NextProjectIntent: AppIntent {
    static var title: LocalizedStringResource = "Next Project"
    func perform() async throws -> some IntentResult { moveProject(1); return .result() }
}

struct PreviousProjectPageIntent: AppIntent {
    static var title: LocalizedStringResource = "Previous Tasks"
    func perform() async throws -> some IntentResult {
        WidgetStore.projectPage = max(0, WidgetStore.projectPage - 1)
        WidgetCenter.shared.reloadTimelines(ofKind: projectWidgetKind)
        return .result()
    }
}

struct NextProjectPageIntent: AppIntent {
    static var title: LocalizedStringResource = "Next Tasks"
    func perform() async throws -> some IntentResult {
        let projects = WidgetStore.loadProjects()
        guard !projects.isEmpty else { return .result() }
        let project = projects[min(WidgetStore.projectIndex, projects.count - 1)]
        let count = WidgetStore.loadProjectTasks().filter { $0.projectId == project.id }.count
        WidgetStore.projectPage = min(max(0, (count - 1) / projectPageSize), WidgetStore.projectPage + 1)
        WidgetCenter.shared.reloadTimelines(ofKind: projectWidgetKind)
        return .result()
    }
}

struct RefreshProjectWidgetIntent: AppIntent {
    static var title: LocalizedStringResource = "Refresh Projects"
    func perform() async throws -> some IntentResult {
        WidgetStore.projectRefreshing = true
        WidgetCenter.shared.reloadTimelines(ofKind: projectWidgetKind)
        await WidgetStore.refreshIfStale(force: true)
        WidgetStore.projectRefreshing = false
        WidgetCenter.shared.reloadTimelines(ofKind: projectWidgetKind)
        return .result()
    }
}

private func moveFilter(_ delta: Int) {
    let count = WidgetStore.loadFilters().count
    guard count > 0 else { return }
    WidgetStore.filterIndex = (WidgetStore.filterIndex + delta + count) % count
    WidgetStore.filterPage = 0
    WidgetCenter.shared.reloadTimelines(ofKind: filterWidgetKind)
}

struct PreviousFilterIntent: AppIntent {
    static var title: LocalizedStringResource = "Previous Filter"
    func perform() async throws -> some IntentResult { moveFilter(-1); return .result() }
}

struct NextFilterIntent: AppIntent {
    static var title: LocalizedStringResource = "Next Filter"
    func perform() async throws -> some IntentResult { moveFilter(1); return .result() }
}

struct PreviousFilterPageIntent: AppIntent {
    static var title: LocalizedStringResource = "Previous Tasks"
    func perform() async throws -> some IntentResult {
        WidgetStore.filterPage = max(0, WidgetStore.filterPage - 1)
        WidgetCenter.shared.reloadTimelines(ofKind: filterWidgetKind)
        return .result()
    }
}

struct NextFilterPageIntent: AppIntent {
    static var title: LocalizedStringResource = "Next Tasks"
    func perform() async throws -> some IntentResult {
        let filters = WidgetStore.loadFilters()
        guard !filters.isEmpty else { return .result() }
        let filter = filters[min(WidgetStore.filterIndex, filters.count - 1)]
        let count = WidgetStore.loadFilterTasks().filter { $0.filterId == filter.id }.count
        WidgetStore.filterPage = min(max(0, (count - 1) / filterPageSize), WidgetStore.filterPage + 1)
        WidgetCenter.shared.reloadTimelines(ofKind: filterWidgetKind)
        return .result()
    }
}

struct RefreshFilterWidgetIntent: AppIntent {
    static var title: LocalizedStringResource = "Refresh Filters"
    func perform() async throws -> some IntentResult {
        WidgetStore.filterRefreshing = true
        WidgetCenter.shared.reloadTimelines(ofKind: filterWidgetKind)
        await WidgetStore.refreshIfStale(force: true)
        WidgetStore.filterRefreshing = false
        WidgetCenter.shared.reloadTimelines(ofKind: filterWidgetKind)
        return .result()
    }
}

struct CompleteProjectTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Complete Task"
    @Parameter(title: "Task") var taskId: String

    init() {}
    init(taskId: String) { self.taskId = taskId }

    func perform() async throws -> some IntentResult {
        WidgetStore.setProjectTaskCompleted(id: taskId, completed: true)
        WidgetCenter.shared.reloadTimelines(ofKind: projectWidgetKind)
        WidgetCenter.shared.reloadTimelines(ofKind: filterWidgetKind)
        if !(await WidgetStore.completeTask(id: taskId)) {
            WidgetStore.setProjectTaskCompleted(id: taskId, completed: false)
            WidgetCenter.shared.reloadTimelines(ofKind: projectWidgetKind)
            WidgetCenter.shared.reloadTimelines(ofKind: filterWidgetKind)
        }
        return .result()
    }
}

// MARK: - Timeline

struct TaskEntry: TimelineEntry {
    let date: Date
    let tasks: [WidgetTask]
    let projectTasks: [WidgetProjectTask]
    let projects: [WidgetProject]
    let filterTasks: [WidgetFilterTask]
    let filters: [WidgetFilter]
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
            projectTasks: [
                WidgetProjectTask(id: "1", name: "Take out the trash", projectId: "home", assignedTo: "1", completed: false, dueDate: today, priority: 1),
                WidgetProjectTask(id: "2", name: "Water the plants", projectId: "home", assignedTo: "1", completed: false, dueDate: today, priority: 2),
            ],
            projects: [WidgetProject(id: "home", name: "Home", color: "#287A5D", icon: "Home")],
            filterTasks: [
                WidgetFilterTask(id: "1", name: "Take out the trash", filterId: "week", assignedTo: "1", completed: false, dueDate: today, priority: 1),
                WidgetFilterTask(id: "2", name: "Water the plants", filterId: "week", assignedTo: "1", completed: false, dueDate: today, priority: 2),
            ],
            filters: [WidgetFilter(id: "week", name: "Due this week", color: "#287A5D")],
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
    if !WidgetStore.projectRefreshing && !WidgetStore.filterRefreshing {
        await WidgetStore.refreshIfStale()
    }
    let members = WidgetStore.loadMembers()
    let avatars = includeOthers ? await AvatarStore.loadAll(members) : [:]
    return TaskEntry(
        date: Date(),
        tasks: WidgetStore.loadTasks(),
        projectTasks: WidgetStore.loadProjectTasks(),
        projects: WidgetStore.loadProjects(),
        filterTasks: WidgetStore.loadFilterTasks(),
        filters: WidgetStore.loadFilters(),
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

// MARK: - Project tasks widget

private extension WidgetProject {
    var backgroundColor: Color {
        var value = color.trimmingCharacters(in: .whitespacesAndNewlines)
        if value.hasPrefix("#") { value.removeFirst() }
        guard value.count == 6, let rgb = UInt64(value, radix: 16) else {
            return Color(red: 0.39, green: 0.45, blue: 0.55)
        }
        return Color(
            red: Double((rgb >> 16) & 0xff) / 255,
            green: Double((rgb >> 8) & 0xff) / 255,
            blue: Double(rgb & 0xff) / 255
        )
    }

    var foregroundColor: Color {
        var value = color.trimmingCharacters(in: .whitespacesAndNewlines)
        if value.hasPrefix("#") { value.removeFirst() }
        guard value.count == 6, let rgb = UInt64(value, radix: 16) else { return .white }
        let luminance = (0.2126 * Double((rgb >> 16) & 0xff)
            + 0.7152 * Double((rgb >> 8) & 0xff)
            + 0.0722 * Double(rgb & 0xff)) / 255
        return luminance > 0.58 ? Color(red: 0.08, green: 0.09, blue: 0.11) : .white
    }

    var systemImage: String {
        switch icon {
        case "Home": return "house.fill"
        case "Work", "BusinessCenter": return "briefcase.fill"
        case "School": return "graduationcap.fill"
        case "Book": return "book.fill"
        case "ShoppingCart": return "cart.fill"
        case "FitnessCenter", "SportsSoccer": return "figure.run"
        case "Restaurant": return "fork.knife"
        case "Flight": return "airplane"
        case "Pets": return "pawprint.fill"
        case "PhotoCamera": return "camera.fill"
        case "MusicNote": return "music.note"
        case "Code", "Computer": return "desktopcomputer"
        case "Build": return "wrench.and.screwdriver.fill"
        case "Palette": return "paintpalette.fill"
        default: return "folder.fill"
        }
    }
}

private struct ProjectControlButton<I: AppIntent>: View {
    let image: String
    let label: String
    let intent: I
    let foreground: Color
    var refreshing = false

    var body: some View {
        Button(intent: intent) {
            Group {
                if refreshing {
                    ProgressView().controlSize(.mini)
                } else {
                    Image(systemName: image)
                        .font(.system(size: 11, weight: .bold))
                }
            }
                .frame(width: 23, height: 23)
                .background(foreground.opacity(0.14))
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
        .foregroundColor(foreground)
        .accessibilityLabel(label)
    }
}

struct ProjectWidgetView: View {
    let entry: TaskEntry

    private var project: WidgetProject? {
        guard !entry.projects.isEmpty else { return nil }
        return entry.projects[min(WidgetStore.projectIndex, entry.projects.count - 1)]
    }

    var body: some View {
        if !entry.signedIn {
            StateMessage(systemImage: "person.crop.circle.badge.exclamationmark",
                         title: "Sign in", detail: "Open Donetick to see your projects")
                .containerBackground(for: .widget) { Color(UIColor.systemBackground) }
        } else if let project = project {
            projectContent(project)
                .containerBackground(for: .widget) { project.backgroundColor }
        } else {
            StateMessage(systemImage: "folder", title: "No projects",
                         detail: "Open Donetick to create or sync a project")
                .containerBackground(for: .widget) { Color(UIColor.systemBackground) }
        }
    }

    private func projectContent(_ project: WidgetProject) -> some View {
        let tasks = entry.projectTasks.filter { $0.projectId == project.id }
        let maxPage = max(0, (tasks.count - 1) / projectPageSize)
        let page = min(WidgetStore.projectPage, maxPage)
        let visible = Array(tasks.dropFirst(page * projectPageSize).prefix(projectPageSize))
        let mine = tasks.filter { $0.assignedTo == entry.myUserId }.count
        let foreground = project.foregroundColor

        let encodedProjectId = project.id.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? project.id
        let projectURL = URL(string: "donetick://chores?project=\(encodedProjectId)")

        return VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                if let projectURL = projectURL {
                    Link(destination: projectURL) {
                        HStack(spacing: 6) {
                            Image(systemName: project.systemImage)
                                .font(.system(size: 15, weight: .semibold))
                            Text(project.name)
                                .font(.system(size: 15, weight: .bold))
                                .lineLimit(1)
                        }
                    }
                }
                Spacer(minLength: 4)
            }
            if let projectURL = projectURL {
                Link(destination: projectURL) {
                    Text("\(tasks.count) tasks · \(mine) assigned to me")
                        .font(.system(size: 9))
                        .opacity(0.76)
                        .lineLimit(1)
                }
            }

            HStack(alignment: .top, spacing: 5) {
                VStack(alignment: .leading, spacing: 2) {
                    if visible.isEmpty {
                        Text("No tasks in this project")
                            .font(.system(size: 12, weight: .medium))
                            .opacity(0.75)
                            .frame(maxWidth: .infinity, minHeight: 44)
                    } else {
                        ForEach(visible) { task in
                            HStack(spacing: 7) {
                                if task.completed {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 16))
                                } else {
                                    Button(intent: CompleteProjectTaskIntent(taskId: task.id)) {
                                        Image(systemName: "circle")
                                            .font(.system(size: 16))
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityLabel("Complete \(task.name)")
                                }
                                if let taskURL = URL(string: "donetick://chores/\(task.id)") {
                                    Link(destination: taskURL) {
                                        Text(task.name)
                                            .font(.system(size: 12, weight: .medium))
                                            .strikethrough(task.completed)
                                            .lineLimit(1)
                                    }
                                }
                                Spacer(minLength: 0)
                            }
                            .frame(maxWidth: .infinity, minHeight: 21, maxHeight: 21,
                                   alignment: .leading)
                            .padding(.horizontal, 3)
                            .background(task.completed ? foreground.opacity(0.10) : Color.clear)
                            .clipShape(RoundedRectangle(cornerRadius: 5))
                        }
                    }
                    Spacer(minLength: 0)
                }

                VStack(alignment: .trailing, spacing: 3) {
                    Spacer(minLength: 0)
                    ProjectControlButton(image: "chevron.up", label: "Previous tasks",
                                         intent: PreviousProjectPageIntent(), foreground: foreground)
                        .opacity(page > 0 ? 1 : 0.35)
                    ProjectControlButton(image: "chevron.down", label: "Next tasks",
                                         intent: NextProjectPageIntent(), foreground: foreground)
                        .opacity(page < maxPage ? 1 : 0.35)
                    HStack(spacing: 2) {
                        ProjectControlButton(image: "chevron.left", label: "Previous project",
                                             intent: PreviousProjectIntent(), foreground: foreground)
                        ProjectControlButton(image: "chevron.right", label: "Next project",
                                             intent: NextProjectIntent(), foreground: foreground)
                        ProjectControlButton(image: "arrow.clockwise", label: "Refresh",
                                             intent: RefreshProjectWidgetIntent(), foreground: foreground,
                                             refreshing: WidgetStore.projectRefreshing)
                    }
                }
            }
        }
        .foregroundColor(foreground)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct ProjectWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: projectWidgetKind, provider: PeopleProvider()) { entry in
            ProjectWidgetView(entry: entry)
        }
        .configurationDisplayName("Project Tasks")
        .description("Browse and complete tasks one project at a time.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// MARK: - Filter tasks widget

private extension WidgetFilter {
    var backgroundColor: Color {
        var value = color.trimmingCharacters(in: .whitespacesAndNewlines)
        if value.hasPrefix("#") { value.removeFirst() }
        guard value.count == 6, let rgb = UInt64(value, radix: 16) else {
            return Color(red: 0.39, green: 0.45, blue: 0.55)
        }
        return Color(
            red: Double((rgb >> 16) & 0xff) / 255,
            green: Double((rgb >> 8) & 0xff) / 255,
            blue: Double(rgb & 0xff) / 255
        )
    }

    var foregroundColor: Color {
        var value = color.trimmingCharacters(in: .whitespacesAndNewlines)
        if value.hasPrefix("#") { value.removeFirst() }
        guard value.count == 6, let rgb = UInt64(value, radix: 16) else { return .white }
        let luminance = (0.2126 * Double((rgb >> 16) & 0xff)
            + 0.7152 * Double((rgb >> 8) & 0xff)
            + 0.0722 * Double(rgb & 0xff)) / 255
        return luminance > 0.58 ? Color(red: 0.08, green: 0.09, blue: 0.11) : .white
    }
}

struct FilterWidgetView: View {
    let entry: TaskEntry

    private var filter: WidgetFilter? {
        guard !entry.filters.isEmpty else { return nil }
        return entry.filters[min(WidgetStore.filterIndex, entry.filters.count - 1)]
    }

    var body: some View {
        if !entry.signedIn {
            StateMessage(systemImage: "person.crop.circle.badge.exclamationmark",
                         title: "Sign in", detail: "Open Donetick to see your filters")
                .containerBackground(for: .widget) { Color(UIColor.systemBackground) }
        } else if let filter {
            filterContent(filter)
                .containerBackground(for: .widget) { filter.backgroundColor }
        } else {
            StateMessage(systemImage: "line.3.horizontal.decrease.circle", title: "No filters",
                         detail: "Create a saved filter in Donetick")
                .containerBackground(for: .widget) { Color(UIColor.systemBackground) }
        }
    }

    private func filterContent(_ filter: WidgetFilter) -> some View {
        let tasks = entry.filterTasks.filter { $0.filterId == filter.id }
        let maxPage = max(0, (tasks.count - 1) / filterPageSize)
        let page = min(WidgetStore.filterPage, maxPage)
        let visible = Array(tasks.dropFirst(page * filterPageSize).prefix(filterPageSize))
        let foreground = filter.foregroundColor
        let encodedId = filter.id.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? filter.id
        let filterURL = URL(string: "donetick://chores?filterId=\(encodedId)")

        return VStack(alignment: .leading, spacing: 2) {
            if let filterURL {
                Link(destination: filterURL) {
                    Text(filter.name)
                        .font(.system(size: 15, weight: .bold))
                        .lineLimit(1)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                Link(destination: filterURL) {
                    Text("\(tasks.count) tasks")
                        .font(.system(size: 9))
                        .opacity(0.76)
                        .lineLimit(1)
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                if visible.isEmpty {
                    Text("No tasks in this filter")
                        .font(.system(size: 12, weight: .medium))
                        .opacity(0.75)
                        .frame(maxWidth: .infinity, minHeight: 44)
                } else {
                    ForEach(visible) { task in
                        HStack(spacing: 7) {
                            if task.completed {
                                Image(systemName: "checkmark.circle.fill").font(.system(size: 16))
                            } else {
                                Button(intent: CompleteProjectTaskIntent(taskId: task.id)) {
                                    Image(systemName: "circle").font(.system(size: 16))
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("Complete \(task.name)")
                            }
                            if let taskURL = URL(string: "donetick://chores/\(task.id)") {
                                Link(destination: taskURL) {
                                    Text(task.name)
                                        .font(.system(size: 12, weight: .medium))
                                        .strikethrough(task.completed)
                                        .lineLimit(1)
                                }
                            }
                            Spacer(minLength: 0)
                        }
                        .frame(maxWidth: .infinity, minHeight: 21, maxHeight: 21,
                               alignment: .leading)
                        .padding(.horizontal, 3)
                        .background(task.completed ? foreground.opacity(0.10) : Color.clear)
                        .clipShape(RoundedRectangle(cornerRadius: 5))
                    }
                }
                Spacer(minLength: 0)
            }

            HStack {
                ProjectControlButton(image: "chevron.left", label: "Previous filter",
                                     intent: PreviousFilterIntent(), foreground: foreground)
                Spacer()
                ProjectControlButton(image: "chevron.up", label: "Previous tasks",
                                     intent: PreviousFilterPageIntent(), foreground: foreground)
                    .opacity(page > 0 ? 1 : 0.35)
                Spacer()
                ProjectControlButton(image: "arrow.clockwise", label: "Refresh",
                                     intent: RefreshFilterWidgetIntent(), foreground: foreground,
                                     refreshing: WidgetStore.filterRefreshing)
                Spacer()
                ProjectControlButton(image: "chevron.down", label: "Next tasks",
                                     intent: NextFilterPageIntent(), foreground: foreground)
                    .opacity(page < maxPage ? 1 : 0.35)
                Spacer()
                ProjectControlButton(image: "chevron.right", label: "Next filter",
                                     intent: NextFilterIntent(), foreground: foreground)
            }
        }
        .foregroundColor(foreground)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct FilterWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: filterWidgetKind, provider: PeopleProvider()) { entry in
            FilterWidgetView(entry: entry)
        }
        .configurationDisplayName("Filter Tasks")
        .description("Browse and complete tasks from your saved filters.")
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
        ProjectWidget()
        FilterWidget()
        QuickCaptureWidget()
    }
}
