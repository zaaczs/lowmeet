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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-xl border bg-white shadow-xl"
        onClick={(eventClick) => eventClick.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-xl">Compartilhar evento</CardTitle>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X size={16} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{event.name}</p>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="break-all text-sm">{eventLink}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="gap-2" onClick={copyLink}>
              <Copy size={14} />
              {copied ? "Link copiado!" : "Copiar link"}
            </Button>
            <Button variant="outline" className="gap-2" onClick={copyCaption}>
              <Copy size={14} />
              Copiar texto + link
            </Button>
            {typeof navigator.share === "function" && (
              <Button
                variant="outline"
                className="gap-2"
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

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => openShare(socialLinks.whatsapp)}
            >
              <MessageCircle size={14} />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => openShare(socialLinks.facebook)}
            >
              <ExternalLink size={14} />
              Facebook
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => openShare(socialLinks.x)}
            >
              <ExternalLink size={14} />X
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => openShare(socialLinks.linkedin)}
            >
              <ExternalLink size={14} />
              LinkedIn
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => openShare(socialLinks.telegram)}
            >
              <Send size={14} />
              Telegram
            </Button>
            <Button
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
