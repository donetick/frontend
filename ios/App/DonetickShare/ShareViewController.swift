import UIKit
import UniformTypeIdentifiers

final class ShareItem {
    var title: String?
    var type: String?
    var url: String?
}

final class ShareViewController: UIViewController {
    private let appGroup = "group.com.donetick.app"

    override func viewDidLoad() {
        super.viewDidLoad()
        Task { await forwardSharedItems() }
    }

    private func forwardSharedItems() async {
        guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        var items: [ShareItem] = []
        for extensionItem in extensionItems {
            for (index, provider) in (extensionItem.attachments ?? []).enumerated() {
                if let item = await load(provider, index: index) {
                    if item.title == nil { item.title = extensionItem.attributedTitle?.string }
                    items.append(item)
                }
            }
        }

        guard !items.isEmpty else {
            finish()
            return
        }

        var components = URLComponents()
        components.scheme = "donetick"
        components.host = "share"
        components.queryItems = items.flatMap { item in
            [
                URLQueryItem(name: "title", value: item.title ?? ""),
                URLQueryItem(name: "description", value: ""),
                URLQueryItem(name: "type", value: item.type ?? ""),
                URLQueryItem(name: "url", value: item.url ?? ""),
            ]
        }

        if let url = components.url {
            _ = openURL(url)
        }
        // Give the host app time to open before dismissing the extension.
        try? await Task.sleep(nanoseconds: 250_000_000)
        finish()
    }

    private func load(_ provider: NSItemProvider, index: Int) async -> ShareItem? {
        do {
            if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                let value = try await provider.loadItem(forTypeIdentifier: UTType.image.identifier)
                if let image = value as? UIImage, let data = image.jpegData(compressionQuality: 0.92) {
                    return save(data: data, name: "shared-image-\(index).jpg", type: "image/jpeg")
                }
                if let url = value as? URL {
                    return copy(url: url, fallbackType: provider.registeredTypeIdentifiers.first)
                }
            }

            if provider.hasItemConformingToTypeIdentifier(UTType.movie.identifier) {
                let value = try await provider.loadItem(forTypeIdentifier: UTType.movie.identifier)
                if let url = value as? URL {
                    return copy(url: url, fallbackType: provider.registeredTypeIdentifiers.first)
                }
            }

            if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                let value = try await provider.loadItem(forTypeIdentifier: UTType.url.identifier)
                if let url = value as? URL {
                    if url.isFileURL {
                        return copy(url: url, fallbackType: provider.registeredTypeIdentifiers.first)
                    }
                    let item = ShareItem()
                    item.title = url.absoluteString
                    item.type = "text/plain"
                    item.url = url.absoluteString
                    return item
                }
            }

            if provider.hasItemConformingToTypeIdentifier(UTType.text.identifier) {
                let value = try await provider.loadItem(forTypeIdentifier: UTType.text.identifier)
                if let text = value as? String {
                    let item = ShareItem()
                    item.title = text
                    item.type = "text/plain"
                    return item
                }
            }

            if let identifier = provider.registeredTypeIdentifiers.first {
                let value = try await provider.loadItem(forTypeIdentifier: identifier)
                if let url = value as? URL {
                    return copy(url: url, fallbackType: identifier)
                }
                if let data = value as? Data {
                    return save(data: data, name: "shared-file-\(index)", type: UTType(identifier)?.preferredMIMEType)
                }
            }
        } catch {
            NSLog("[DonetickShare] Failed to load item: %@", error.localizedDescription)
        }
        return nil
    }

    private func copy(url: URL, fallbackType: String?) -> ShareItem? {
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        guard let data = try? Data(contentsOf: url) else { return nil }
        let type = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType
            ?? fallbackType.flatMap { UTType($0)?.preferredMIMEType }
        return save(data: data, name: url.lastPathComponent, type: type)
    }

    private func save(data: Data, name: String, type: String?) -> ShareItem? {
        guard let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroup
        ) else { return nil }

        let safeName = name.replacingOccurrences(of: "/", with: "-")
        let destination = container.appendingPathComponent("\(UUID().uuidString)-\(safeName)")
        do {
            try data.write(to: destination, options: .atomic)
            let item = ShareItem()
            item.title = name
            item.type = type ?? "application/octet-stream"
            item.url = destination.absoluteString
            return item
        } catch {
            NSLog("[DonetickShare] Failed to copy item: %@", error.localizedDescription)
            return nil
        }
    }

    private func finish() {
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }

    @objc private func openURL(_ url: URL) -> Bool {
        var responder: UIResponder? = self
        while let current = responder {
            if let application = current as? UIApplication {
                application.perform(Selector(("openURL:")), with: url)
                return true
            }
            responder = current.next
        }
        return false
    }
}
