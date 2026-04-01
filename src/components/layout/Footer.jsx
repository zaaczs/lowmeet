import profileImage from "../../../501190974_17958817823946559_5205002454053393661_n.jpg";

function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="flex w-full flex-col gap-4 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:gap-8 md:px-8">
        <div className="space-y-4 md:max-w-5xl">
          <p className="font-medium text-slate-700">
            LowMeet - Plataforma de eventos automotivos.
          </p>
          <p>
            Desenvolvido por Isaac Ramos, criador da página{" "}
            <span className="font-semibold">@celtabombado</span>.
          </p>
          <p className="max-w-4xl">
            Desde a infância, os carros sempre fizeram parte da minha história. Entre
            encontros, oficinas e amizades da cena automotiva, nasceu a vontade de criar
            o LowMeet para conectar a comunidade, facilitar a divulgação de eventos e dar
            mais visibilidade para parceiros do meio.
          </p>
        </div>
        <a
          href="https://instagram.com/celtabombado"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-3 self-center rounded-xl border bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-muted md:ml-auto md:self-center"
          aria-label="Instagram do criador @celtabombado"
        >
          <img
            src={profileImage}
            alt="Foto do perfil @celtabombado"
            className="h-10 w-10 rounded-lg object-cover"
          />
          <div className="leading-tight">
            <p className="text-xs text-muted-foreground">Instagram</p>
            <p>@celtabombado</p>
          </div>
        </a>
      </div>
    </footer>
  );
}

export default Footer;
