import { useAttachmentUrl } from "@/workshop/hooks/useAttachmentUrl";
import type { WorkshopAttachment } from "@/workshop/types";

export function MessageAttachment({ attachment }: { attachment: WorkshopAttachment }) {
  const url = useAttachmentUrl(attachment.path);
  if (!url) return <div className="attachment-loading">Loading image…</div>;
  return <a className="message-attachment" href={url} target="_blank" rel="noreferrer"><img src={url} alt={attachment.name} /></a>;
}
