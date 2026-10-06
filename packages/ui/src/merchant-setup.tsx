"use client";
import { api } from "@sihhat/api-client";
import {
  Act,
  Card,
  ErrorBox,
  Loading,
  type Row,
  usePortal,
  useRemote,
} from "./components";

export function MerchantSetupPanel({
  tenant,
  banks,
}: {
  tenant: string;
  banks: Row[];
}) {
  const ctx = usePortal();
  const remote = useRemote(
    `/partner/sanatoriums/${tenant}/merchant-setup`,
    ctx.epoch,
  );
  const setup = remote.data?.setup;
  const approved = banks.filter((b) => b.status === "APPROVED");
  const bank =
    approved.find((b) => b.id === setup?.bankRevisionId) ?? approved[0];
  function edit() {
    ctx.form({
      title: "Sanatoriya to‘lov hisobini ulash",
      description:
        "Hisob sanatoriyaning o‘z yuridik nomiga ochiladi. Merchant ID va kassa kodini kiriting; maxfiy API kalitini bu yerga yozmang.",
      fields: [
        {
          key: "legal_name",
          label: "Merchantning yuridik nomi",
          required: true,
          value: setup?.legalName ?? bank?.data.legal_name,
        },
        {
          key: "stir",
          label: "STIR",
          pattern: "[0-9]{9}",
          required: true,
          value: setup?.stir ?? bank?.data.stir,
        },
        {
          key: "bank_revision_id",
          label: "Sanatoriyaning tasdiqlangan bank hisobi",
          type: "select",
          value: setup?.bankRevisionId ?? bank?.id,
          options: approved.map((b) => ({
            value: b.id,
            label: `${b.data.legal_name} · ${b.data.account}`,
          })),
        },
        {
          key: "merchant_id",
          label: "Tezcheck merchant ID",
          value: setup?.merchantId,
          hint: "Hisob ochilgach to‘ldiriladi. API kaliti emas.",
        },
        {
          key: "cash_desk_code",
          label: "Tezcheck kassa kodi",
          value: setup?.cashDeskCode,
          hint: "Aynan shu sanatoriya merchantiga tegishli kassa kodi.",
        },
      ],
      submit: (values) =>
        api(`/partner/sanatoriums/${tenant}/merchant-setup`, "PATCH", {
          version: setup?.version ?? 0,
          ...values,
        }),
      done: ctx.refresh,
      button: "Ulash sozlamalarini saqlash",
    });
  }
  return (
    <Card
      title="Sanatoriyaning o‘z to‘lov hisobi"
      aside={<Act onClick={edit}>Ulash sozlamalari</Act>}
    >
      {remote.loading ? (
        <Loading />
      ) : remote.error ? (
        <ErrorBox message={remote.error} retry={remote.reload} />
      ) : (
        <div className="card-body">
          <p>
            To‘lov sanatoriyaning o‘z nomidagi hisobga tushishi uchun alohida
            merchant hisobi kerak.
          </p>
          <p className="muted">
            {setup?.status === "WAITING_VERIFICATION"
              ? "Rekvizitlar saqlandi. Merchantga egalik va server ulanishi tekshirilishi kutilmoqda."
              : "Merchant hisobi ochilishi kutilmoqda. Mavjud rekvizitlarni hozirdan saqlashingiz mumkin."}
          </p>
          {setup && (
            <dl className="detail-grid">
              <div>
                <dt>Yuridik nom</dt>
                <dd>{setup.legalName}</dd>
              </div>
              <div>
                <dt>STIR</dt>
                <dd>{setup.stir}</dd>
              </div>
              <div>
                <dt>Merchant ID</dt>
                <dd>{setup.merchantId ?? "Hali kiritilmagan"}</dd>
              </div>
              <div>
                <dt>Kassa kodi</dt>
                <dd>{setup.cashDeskCode ?? "Hali kiritilmagan"}</dd>
              </div>
            </dl>
          )}
          <p className="muted">
            To‘lov ulanish tekshirilgach yoqiladi. Rekvizitlarni saqlash
            to‘lovni faollashtirmaydi.
          </p>
        </div>
      )}
    </Card>
  );
}
