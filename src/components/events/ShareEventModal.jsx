import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, MessageCircle, Send, X } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

function ShareEventModal({ event, open, onClose }) {
  const [copied, setCopied] = useState(false);

  const eventLink = useMemo(
    () => `${window.location.origin}/eventos/${event.id}`,
    [event.id]
  );
  const shareText = useMemo(
    () => `Confere esse evento no LowMeet: ${event.name}`,
    [event.name]
  );

  useEffect(() => {
    if (!open) return undefined;
    const handleEscape = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const copyCaption = async () => {
    const caption = `${shareText}\n${eventLink}`;
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const openShare = (url) => window.open(url, "_blank", "noopener,noreferrer");

  const socialLinks = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${eventLink}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventLink)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(eventLink)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventLink)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(eventLink)}&text=${encodeURIComponent(shareText)}`,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 py-8"
      onClick={onClose}
    >
      <Card
        className="my-auto w-full max-h-[90vh] max-w-xl overflow-y-auto border bg-white shadow-xl"
        onClick={(eventClick) => eventClick.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-xl">Compartilhar evento</CardTitle>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            <X size={16} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{event.name}</p>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="break-all text-sm">{eventLink}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="button" variant="secondary" className="w-full gap-2 sm:w-auto" onClick={copyLink}>
              <Copy size={14} />
              {copied ? "Link copiado!" : "Copiar link"}
            </Button>
            <Button type="button" variant="outline" className="w-full gap-2 sm:w-auto" onClick={copyCaption}>
              <Copy size={14} />
              Copiar texto + link
            </Button>
            {typeof navigator.share === "function" && (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 sm:w-auto"
                onClick={() =>
                  navigator.share({
                    title: event.name,
                    text: shareText,
                    url: eventLink,
                  })
                }
              >
                <Send size={14} />
                Compartilhar nativo
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2"
              onClick={() => openShare(socialLinks.whatsapp)}
            >
              <MessageCircle size={14} />
              WhatsApp
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2"
              onClick={() => openShare(socialLinks.facebook)}
            >
              <ExternalLink size={14} />
              Facebook
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2"
              onClick={() => openShare(socialLinks.x)}
            >
              <ExternalLink size={14} />X
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2"
              onClick={() => openShare(socialLinks.linkedin)}
            >
              <ExternalLink size={14} />
              LinkedIn
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2"
              onClick={() => openShare(socialLinks.telegram)}
            >
              <Send size={14} />
              Telegram
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2"
              onClick={async () => {
                await copyCaption();
                openShare("https://www.instagram.com/");
              }}
            >
              <ExternalLink size={14} />
              Instagram (copiar e colar)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ShareEventModal;
