import React from "react";
import { CertificateTemplate } from "../types";

interface OrgCertificatePreviewProps {
  template: CertificateTemplate;
  compact?: boolean;
}

function pickHttpUrl(value?: string | null) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim())
    ? value.trim()
    : "";
}

export function parseAssignedTemplateDisplay(tpl: Record<string, unknown>) {
  const empty = {
    description: "",
    title: "",
    theme: "",
    signatory: "",
    signatoryRole: "",
    signatory2: "",
    signatoryRole2: "",
    signatorySignatureUrl: "",
    signatory2SignatureUrl: "",
  };

  const fromApi = {
    description: typeof tpl.description === "string" ? tpl.description : "",
    title: typeof tpl.title === "string" ? tpl.title : "",
    theme: typeof tpl.theme === "string" ? tpl.theme : "",
    signatory: typeof tpl.signatory === "string" ? tpl.signatory : "",
    signatoryRole: typeof tpl.signatoryRole === "string" ? tpl.signatoryRole : "",
    signatory2: typeof tpl.signatory2 === "string" ? tpl.signatory2 : "",
    signatoryRole2: typeof tpl.signatoryRole2 === "string" ? tpl.signatoryRole2 : "",
    signatorySignatureUrl: pickHttpUrl(tpl.signatorySignatureUrl as string),
    signatory2SignatureUrl: pickHttpUrl(tpl.signatory2SignatureUrl as string),
  };

  const raw = fromApi.description;
  if (!raw.trim().startsWith("{")) {
    return {
      ...empty,
      ...fromApi,
      description: raw.includes("themeConfig") ? "" : raw,
    };
  }

  try {
    const parsed = JSON.parse(raw) as {
      internalNote?: string;
      themeConfig?: {
        title?: string;
        theme?: string;
        signatory?: string;
        signatoryRole?: string;
        signatory2?: string;
        signatoryRole2?: string;
      };
    };
    const theme = parsed.themeConfig ?? {};
    return {
      description: parsed.internalNote?.trim() || "",
      title: fromApi.title || theme.title || "",
      theme: fromApi.theme || theme.theme || "",
      signatory: fromApi.signatory || theme.signatory || "",
      signatoryRole: fromApi.signatoryRole || theme.signatoryRole || "",
      signatory2: fromApi.signatory2 || theme.signatory2 || "",
      signatoryRole2: fromApi.signatoryRole2 || theme.signatoryRole2 || "",
      signatorySignatureUrl: fromApi.signatorySignatureUrl,
      signatory2SignatureUrl: fromApi.signatory2SignatureUrl,
    };
  } catch {
    return { ...empty, ...fromApi, description: "" };
  }
}

function MecureCertificate({ template }: { template: CertificateTemplate }) {
  const issuedOn = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      id="certificate-preview"
      className="bg-white w-[760px] min-h-[540px] shrink-0 shadow-2xl relative flex flex-col items-center text-center px-12 py-10 font-sans overflow-hidden"
    >
      <div
        className="absolute top-0 left-0 w-0 h-0 border-t-[88px] border-r-[88px] border-t-brand-accent border-r-transparent pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute top-0 right-0 w-0 h-0 border-t-[88px] border-l-[88px] border-t-brand-accent border-l-transparent pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 w-full flex-1 flex flex-col items-center pt-2 pb-28">
        <h1
          className="text-[2.75rem] font-bold tracking-[0.08em] text-[#C9A227] leading-none"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          CERTIFICATE
        </h1>
        <p
          className="text-sm font-bold uppercase tracking-[0.35em] text-brand-grey mt-2"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          OF COMPLETION
        </p>

        <p className="text-sm text-brand-grey mt-10">This is to certify that</p>
        <p
          className="text-4xl text-[#C9A227] mt-4 px-4"
          style={{ fontFamily: '"Great Vibes", cursive' }}
        >
          Macdara Rashawn
        </p>
        <p className="text-sm text-brand-grey mt-5">Has successfully completed the</p>
        <p className="text-base font-bold text-brand-grey mt-2 uppercase tracking-wide max-w-[85%]">
          2030 Online Course Developer
        </p>

        <p className="text-sm text-brand-grey mt-6">{issuedOn}</p>

        <div className="w-full flex justify-between items-end mt-auto px-6 pt-8">
          <div className="text-center w-[42%]">
            {template.signatorySignatureUrl ? (
              <img
                src={template.signatorySignatureUrl}
                alt="Left signatory signature"
                className="mx-auto max-h-10 max-w-[140px] object-contain mb-1"
              />
            ) : null}
            <div className="w-full border-t border-brand-grey/60 mb-2" />
            <p className="text-sm font-semibold text-brand-grey">
              {template.signatory || "Signatory Name"}
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mt-1">
              {template.signatoryRole || "Role"}
            </p>
          </div>

          <div className="text-center w-[42%]">
            {template.signatory2SignatureUrl ? (
              <img
                src={template.signatory2SignatureUrl}
                alt="Right signatory signature"
                className="mx-auto max-h-10 max-w-[140px] object-contain mb-1"
              />
            ) : null}
            <div className="w-full border-t border-brand-grey/60 mb-2" />
            <p className="text-sm font-semibold text-brand-grey">
              {template.signatory2 || "Signatory Name"}
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mt-1">
              {template.signatoryRole2 || "Role"}
            </p>
          </div>
        </div>

        <div className="absolute bottom-[34px] left-1/2 -translate-x-1/2 z-20">
          {template.previewUrl ? (
            <img
              src={template.previewUrl}
              alt="MeCure Industries logo"
              className="max-h-16 max-w-[160px] object-contain"
            />
          ) : (
            <div className="flex h-14 w-40 items-center justify-center rounded border border-dashed border-gray-300 bg-white/90 text-[10px] text-gray-400">
              MeCure logo
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[6px] bg-brand-accent-dark pointer-events-none" />
      <div className="absolute bottom-[6px] left-0 right-0 h-[22px] bg-brand-accent pointer-events-none" />
    </div>
  );
}

function FallbackCertificate({ template }: { template: CertificateTemplate }) {
  const title = template.title || "Certificate of Completion";
  const issuedOn = new Date().toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      id="certificate-preview"
      className="bg-white w-[760px] min-h-[540px] shrink-0 shadow-2xl relative flex flex-col items-center text-center px-12 py-10 font-sans border border-slate-200"
    >
      {template.previewUrl ? (
        <img
          src={template.previewUrl}
          alt="Certificate logo"
          className="mx-auto max-h-20 max-w-[220px] object-contain mb-5"
        />
      ) : null}
      <div className="text-[11px] uppercase tracking-[0.35em] mb-4 text-gray-400">
        MeCure Excellence Academy
      </div>
      <h1 className="text-4xl font-bold text-brand-primary tracking-tight">{title}</h1>
      <p className="text-lg text-gray-500 mt-8">This certifies that</p>
      <p className="text-3xl font-semibold w-2/3 mx-auto pb-2 border-b-2 border-brand-primary/30 text-gray-800 mt-4">
        Macdara Rashawn
      </p>
      <p className="text-gray-500 mt-5">has successfully completed the course requirements for</p>
      <p className="text-xl font-semibold text-brand-primary-dark mt-3">
        2030 Online Course Developer
      </p>
      <p className="font-medium text-gray-700 mt-5">{issuedOn}</p>
      <div className="w-full flex justify-between items-end mt-auto px-6 pt-10">
        <div className="text-center w-[42%]">
          {template.signatorySignatureUrl ? (
            <img
              src={template.signatorySignatureUrl}
              alt="Left signatory signature"
              className="mx-auto max-h-10 max-w-[140px] object-contain mb-1"
            />
          ) : null}
          <div className="w-full border-t border-gray-400 mb-2" />
          <p className="text-sm font-semibold text-gray-800">
            {template.signatory || "Signatory Name"}
          </p>
          <p className="text-xs text-gray-400 mt-2 uppercase tracking-[0.2em]">
            {template.signatoryRole || "Role"}
          </p>
        </div>
        <div className="text-center w-[42%]">
          {template.signatory2SignatureUrl ? (
            <img
              src={template.signatory2SignatureUrl}
              alt="Right signatory signature"
              className="mx-auto max-h-10 max-w-[140px] object-contain mb-1"
            />
          ) : null}
          <div className="w-full border-t border-gray-400 mb-2" />
          <p className="text-sm font-semibold text-gray-800">
            {template.signatory2 || "Signatory Name"}
          </p>
          <p className="text-xs text-gray-400 mt-2 uppercase tracking-[0.2em]">
            {template.signatoryRole2 || "Role"}
          </p>
        </div>
      </div>
    </div>
  );
}

export const OrgCertificatePreview: React.FC<OrgCertificatePreviewProps> = ({
  template,
  compact = false,
}) => {
  const isMecure = !template.theme || template.theme === "mecure";
  const certificate = isMecure ? (
    <MecureCertificate template={template} />
  ) : (
    <FallbackCertificate template={template} />
  );

  if (!compact) {
    return <div className="overflow-x-auto">{certificate}</div>;
  }

  const scale = 0.88;
  return (
    <div className="relative w-full overflow-hidden bg-white" style={{ height: 540 * scale }}>
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ transform: `scale(${scale})` }}
      >
        {certificate}
      </div>
    </div>
  );
};
