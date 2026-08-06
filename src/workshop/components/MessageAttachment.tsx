import { useAttachmentUrl } from "@/workshop/hooks/useAttachmentUrl";
import type { WorkshopAttachment } from "@/workshop/types";

export function MessageAttachment({ attachment }: { attachment: WorkshopAttachment }) {
  const { url, error, retry } = useAttachmentUrl(attachment.path);
  if (error) {
    return (
      <div className="attachment-error" role="status">
        <span>Image unavailable</span>
        <button type="button" onClick={retry}>Try again</button>
      </div>
    );
  }
  if (!url) return <div className="attachment-loading">Loading image…</div>;
  return <a className="message-attachment" href={url} target="_blank" rel="noreferrer"><img src={url} alt={attachment.name} /></a>;
}
