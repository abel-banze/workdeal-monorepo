"use client";

import { ShareDialog } from "./share-dialog";

type Props = {
  trigger: React.ReactElement;
  profileName: string;
  profileSlug: string;
  profileTagline?: string | null;
};

export function ShareProfileDialog({ trigger, profileName, profileSlug, profileTagline }: Props) {
  const shareText = `${profileName}${profileTagline ? ` — ${profileTagline}` : ""} · Perfil no Workdeal`;
  return (
    <ShareDialog
      trigger={trigger}
      dialogTitle="Partilhar perfil"
      itemName={profileName}
      path={`/profiles/${encodeURIComponent(profileSlug)}`}
      shareText={shareText}
      mailSubject={`${profileName} no Workdeal`}
      footerNote="Qualquer pessoa com o link pode ver este perfil público"
    />
  );
}
