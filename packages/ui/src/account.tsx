"use client";
import { api } from "@sihhat/api-client";
import {
  Act,
  Card,
  dateTime,
  ErrorBox,
  label,
  Loading,
  PageHeading,
  Table,
  usePortal,
  useRemote,
} from "./components";

export function MyAccount({ changePassword }: { changePassword: () => void }) {
  const ctx = usePortal(),
    sessions = useRemote("/auth/sessions", ctx.epoch);
  const role = ctx.admin
    ? "SUPERADMIN"
    : (ctx.actor.memberships.find(
        (m) => m.sanatoriumId === ctx.tenant && m.status === "ACTIVE",
      )?.role ?? "STAFF");
  const close = (id?: string) =>
    ctx.form({
      title: id
        ? "Boshqa qurilmadagi kirishni yopish"
        : "Boshqa qurilmalardan chiqish",
      fields: [],
      description:
        "Ushbu qurilmadagi kirish saqlanadi. Yopilgan qurilmada qayta kirish talab qilinadi.",
      submit: () =>
        api(
          id ? `/auth/sessions/${id}/revoke` : "/auth/sessions/revoke-others",
          "POST",
          {},
        ),
      done: ctx.refresh,
    });
  return (
    <>
      <PageHeading
        title="Mening hisobim"
        subtitle="Shaxsiy ma’lumotlar, parol va faol kirishlar."
      />
      <Card title="Hisob ma’lumotlari">
        <dl className="account-details">
          <dt>Ism</dt>
          <dd>{ctx.actor.name}</dd>
          <dt>Login</dt>
          <dd>{ctx.actor.login ?? "—"}</dd>
          <dt>Telefon</dt>
          <dd>{ctx.actor.phone ?? "—"}</dd>
          <dt>Lavozim</dt>
          <dd>{label[role] ?? role}</dd>
        </dl>
        <div className="toolbar">
          <button
            className="button secondary"
            onClick={() =>
              ctx.form({
                title: "Ismni o‘zgartirish",
                fields: [
                  {
                    key: "name",
                    label: "Ism",
                    required: true,
                    minLength: 2,
                    maxLength: 120,
                    value: ctx.actor.name,
                  },
                ],
                submit: (values) => api("/auth/profile", "PATCH", values),
                done: () => {
                  ctx.reloadActor?.();
                  ctx.refresh();
                },
              })
            }
          >
            Ismni o‘zgartirish
          </button>
          <button className="button primary" onClick={changePassword}>
            Parolni almashtirish
          </button>
        </div>
      </Card>
      <Card
        title="Faol kirishlar"
        aside={
          <button
            className="button secondary"
            disabled={!sessions.data?.data.some((row: any) => !row.current)}
            onClick={() => close()}
          >
            Boshqa qurilmalardan chiqish
          </button>
        }
      >
        {sessions.loading ? (
          <Loading />
        ) : sessions.error ? (
          <ErrorBox message={sessions.error} retry={sessions.reload} />
        ) : (
          <Table
            rows={sessions.data?.data ?? []}
            columns={[
              {
                label: "Qurilma",
                render: (row) => (
                  <>
                    {row.deviceLabel}
                    {row.current && (
                      <strong className="subcell">Joriy qurilma</strong>
                    )}
                  </>
                ),
              },
              {
                label: "Kirish boshlangan",
                render: (row) => dateTime(row.createdAt),
              },
              {
                label: "Oxirgi faollik",
                render: (row) => dateTime(row.lastActivityAt),
              },
            ]}
            actions={(row) =>
              row.current ? (
                <span className="muted">Joriy kirish</span>
              ) : (
                <Act onClick={() => close(row.id)}>Kirishni yopish</Act>
              )
            }
          />
        )}
      </Card>
    </>
  );
}

export function RoleGuide() {
  const ctx = usePortal();
  const role = ctx.admin
    ? "SUPERADMIN"
    : (ctx.actor.memberships.find(
        (m) => m.sanatoriumId === ctx.tenant && m.status === "ACTIVE",
      )?.role ?? "STAFF");
  const guides = [
    {
      title: "Hisob va parol",
      text: "Mening hisobimda shaxsiy parolingizni almashtiring va boshqa qurilmalardagi kirishlarni yoping. Parol unutilsa resepshin/hisobchi direktorga, direktor superadminga murojaat qiladi.",
      section: "account",
    },
    ...(ctx.allowed("bookings.read")
      ? [
          {
            title: "Bronni topish",
            text: "Bronlar bo‘limida bron raqami, mehmon ismi yoki telefonni yozib Qidirishni bosing. Sana va holat filtrlari shu hisob va sanatoriya uchun saqlanadi. Qidiruvdagi shaxsiy ma’lumotlar brauzerda saqlanmaydi.",
            section: "bookings",
          },
          {
            title: "Bugungi ishlar",
            text: "Keladiganlar, ketadiganlar va to‘lovi yakunlanmagan bronlarni oching. Mehmonning hujjati va joriy bron holatini tekshirib, ruxsat berilgan kelish yoki ketish amalini tasdiqlang.",
            section: "today",
          },
        ]
      : []),
    ...(ctx.allowed("reports.operational.read") ||
    ctx.allowed("reports.financial.read")
      ? [
          {
            title: "Hisobotlar",
            text: "Davrni tanlang. Hisobchi CSV yoki Excel faylini yuklashi, hisobotni chop etishi/PDFga saqlashi va oldingi davr bilan solishtirishi mumkin. Yuklash uchun eksport vakolati kerak.",
            section: "dashboard",
          },
        ]
      : []),
    ...(ctx.allowed("staff.reset")
      ? [
          {
            title: "Xodim parolini tiklash",
            text: "Jamoa va ruxsatlarda xodimning Parolni tiklash amalini tanlang. Yangi parolni ikki marta yozing. Saqlangach yangi parol amal qiladi va oldingi kirishlar yopiladi.",
            section: "staff",
          },
        ]
      : []),
  ];
  return (
    <>
      <PageHeading
        title="Foydalanish yo‘riqnomasi"
        subtitle={`${label[role] ?? role} uchun mavjud amallar`}
      />
      {guides.map((guide) => (
        <Card title={guide.title} key={guide.title}>
          <p>{guide.text}</p>
          <button
            className="button secondary"
            onClick={() => ctx.go(guide.section)}
          >
            Bo‘limni ochish
          </button>
        </Card>
      ))}
    </>
  );
}
