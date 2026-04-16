import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { ROLES, useAuth } from "../context/AuthContext";
import { sendTwoFactorCode, verifyTwoFactorCode } from "../services/twoFactorService";
import OtpCodeInput from "../components/auth/OtpCodeInput";
import { useBrazilLocations } from "../hooks/useBrazilLocations";
import loginHeroCar from "../assets/nissanjdm.webp";

const TWO_FACTOR_BYPASS_EMAILS = new Set(["teste.bloqueio.banner@lowmeet.com"]);
const MAIN_ADMIN_EMAIL = "lowmeetlowmeet@gmail.com";

function shouldBypassTwoFactor(email) {
  return TWO_FACTOR_BYPASS_EMAILS.has(String(email || "").trim().toLowerCase());
}

function hasTwoFactorDeliveryConfigured() {
  return Boolean(
    import.meta.env.VITE_2FA_WEBHOOK_URL ||
      (import.meta.env.VITE_EMAILJS_SERVICE_ID &&
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID &&
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY)
  );
}

function LoginPage() {
  const { user, login, register, logout, emailExists, validateLoginCredentials } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [step, setStep] = useState("credentials");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    state: "",
    city: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const nextPath = useMemo(() => location.state?.next || "/", [location.state]);
  const favoriteEventId = useMemo(() => location.state?.favoriteEventId, [location.state]);
  const { stateOptions, cityOptions, loadingStates, loadingCities } = useBrazilLocations(form.state);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const resetVerificationFlow = () => {
    setStep("credentials");
    setVerificationCode("");
    setInfo("");
  };

  const handleCredentialsSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");
    setIsSendingCode(true);

    try {
      if (isRegister) {
        if (form.password !== form.confirmPassword) {
          throw new Error("As senhas não conferem");
        }
        if (!form.state || !form.city) {
          throw new Error("Selecione estado e cidade para concluir o cadastro");
        }
        if (emailExists(form.email)) {
          throw new Error("E-mail já cadastrado");
        }
      } else {
        validateLoginCredentials(form);
        if (shouldBypassTwoFactor(form.email)) {
          login(form);
          navigate(nextPath);
          return;
        }
        const isMainAdmin =
          String(form.email || "").trim().toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase();
        if (isMainAdmin && !hasTwoFactorDeliveryConfigured()) {
          login(form);
          navigate(nextPath);
          return;
        }
      }

      const { mode } = await sendTwoFactorCode(form.email);
      setStep("verify");
      setInfo(
        mode === "webhook"
          ? "Código enviado para seu e-mail."
          : "Código enviado para seu e-mail via EmailJS."
      );
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifySubmit = (event) => {
    event.preventDefault();
    setError("");
    setInfo("");

    if (verificationCode.length !== 6) {
      setError("Digite os 6 dígitos do código");
      return;
    }

    const verification = verifyTwoFactorCode(form.email, verificationCode);
    if (!verification.ok) {
      setError(verification.message);
      return;
    }

    try {
      if (isRegister) {
        register({ ...form, role: ROLES.VISITOR });
      } else {
        login(form);
      }
      navigate(nextPath);
    } catch (submissionError) {
      setError(submissionError.message);
    }
  };

  if (user) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-gradient-to-br from-slate-100 via-background to-slate-200/50 px-4 py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-5%,hsl(var(--primary)/0.14),transparent)]" />
        <div className="relative z-10 w-full max-w-md space-y-6 text-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              LowMeet
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Low<span className="text-primary">Meet</span>
            </h1>
          </div>
          <Card className="text-left shadow-lg">
            <CardHeader>
              <CardTitle>Você está autenticado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{user.name}</p>
              <p className="text-muted-foreground">
                {user.email} - {user.role}
              </p>
              <Button onClick={logout}>Sair</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-gradient-to-br from-slate-100 via-background to-slate-200/50 px-4 py-10 sm:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-5%,hsl(var(--primary)/0.14),transparent)]" />
      <div className="relative z-10 flex w-full max-w-6xl flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10 xl:gap-14">
        <div className="flex w-full flex-col items-center text-center lg:max-w-none lg:flex-1 lg:items-start lg:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Bem-vindo ao
          </p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Low<span className="text-primary">Meet</span>
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
            Eventos e encontros automotivos perto de você.
          </p>
          <div className="relative mt-4 w-full max-w-[min(1100px,94vw)] lg:mt-6">
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-[6%] left-1/2 z-0 h-[min(18%,120px)] w-[min(72%,720px)] -translate-x-1/2 rounded-[100%] bg-slate-900/[0.12] blur-2xl"
            />
            <img
              src={loginHeroCar}
              alt="Ilustração de carro esportivo"
              className="relative z-[1] mx-auto h-auto w-full object-contain object-bottom lg:max-h-[min(72vh,688px)]"
              width={1100}
              height={688}
              decoding="sync"
              fetchPriority="high"
            />
          </div>
        </div>
        <div className="w-full max-w-md shrink-0 lg:max-w-[26rem]">
          <Card className="shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle>{isRegister ? "Criar conta" : "Entrar"}</CardTitle>
            </CardHeader>
            <CardContent>
              {favoriteEventId && (
                <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
                  Faça login ou cadastro para favoritar este evento e acessar sua lista de
                  favoritos.
                </div>
              )}
              <form
                onSubmit={step === "credentials" ? handleCredentialsSubmit : handleVerifySubmit}
                className="space-y-3"
              >
                {step === "credentials" ? (
                  <>
                    {isRegister && (
                      <Input
                        placeholder="Nome"
                        value={form.name}
                        onChange={(event) => setField("name", event.target.value)}
                        required
                      />
                    )}
                    {isRegister && (
                      <Select
                        value={form.state}
                        onChange={(event) => {
                          const nextState = event.target.value;
                          setForm((prev) => ({ ...prev, state: nextState, city: "" }));
                        }}
                        required
                      >
                        <option value="">
                          {loadingStates ? "Carregando estados..." : "Selecione seu estado"}
                        </option>
                        {stateOptions.map((state) => (
                          <option key={state.value} value={state.value}>
                            {state.label}
                          </option>
                        ))}
                      </Select>
                    )}
                    {isRegister && (
                      <Select
                        value={form.city}
                        onChange={(event) => setField("city", event.target.value)}
                        disabled={!form.state || loadingCities}
                        required
                      >
                        <option value="">
                          {!form.state
                            ? "Selecione o estado primeiro"
                            : loadingCities
                              ? "Carregando cidades..."
                              : "Selecione sua cidade"}
                        </option>
                        {cityOptions.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </Select>
                    )}
                    <Input
                      type="email"
                      placeholder="E-mail"
                      value={form.email}
                      onChange={(event) => setField("email", event.target.value)}
                      required
                    />
                    <Input
                      type="password"
                      placeholder="Senha"
                      value={form.password}
                      onChange={(event) => setField("password", event.target.value)}
                      required
                    />
                    {isRegister && (
                      <Input
                        type="password"
                        placeholder="Confirmar senha"
                        value={form.confirmPassword}
                        onChange={(event) => setField("confirmPassword", event.target.value)}
                        required
                      />
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Digite o código de 6 dígitos enviado para <strong>{form.email}</strong>.
                    </p>
                    <OtpCodeInput value={verificationCode} onChange={setVerificationCode} />
                    <p className="text-xs text-muted-foreground">
                      O código expira em 10 minutos.
                    </p>
                  </>
                )}
                {info && <p className="text-sm text-blue-700">{info}</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}
                {step === "credentials" ? (
                  <>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSendingCode}
                    >
                      {isSendingCode
                        ? "Enviando código..."
                        : isRegister
                          ? "Continuar cadastro"
                          : "Continuar"}
                    </Button>
                    <button
                      type="button"
                      className="text-sm text-primary"
                      onClick={() => {
                        setIsRegister((prev) => !prev);
                        resetVerificationFlow();
                        setError("");
                      }}
                    >
                      {isRegister
                        ? "Já possui conta? Entrar"
                        : "Ainda não tem conta? Criar agora"}
                    </button>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit">
                      Confirmar código
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        setError("");
                        setInfo("");
                        try {
                          const { mode } = await sendTwoFactorCode(form.email);
                          setInfo(
                            mode === "webhook"
                              ? "Novo código enviado para seu e-mail."
                              : "Novo código enviado por EmailJS."
                          );
                        } catch (resendError) {
                          setError(resendError.message);
                        }
                      }}
                    >
                      Reenviar código
                    </Button>
                    <Button type="button" variant="ghost" onClick={resetVerificationFlow}>
                      Voltar
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
