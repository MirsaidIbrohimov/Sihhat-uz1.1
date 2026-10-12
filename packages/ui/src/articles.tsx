"use client";
import { FileText, Lightbulb } from "lucide-react";
import {
  Act,
  AddButton,
  Badge,
  DataPanel,
  FeedItem,
  PageHeading,
  date,
  useAction,
  type Field,
  type Row,
} from "./components";

export function PublicArticles() {
  const action = useAction();
  function edit(article?: Row) {
    const fields: Field[] = [
      {
        key: "title",
        label: "Sarlavha",
        required: true,
        minLength: 3,
        value: article?.title,
      },
      {
        key: "summary",
        label: "Qisqa mazmun",
        type: "textarea",
        required: true,
        minLength: 10,
        value: article?.summary,
      },
      {
        key: "body",
        label: "To‘liq matn",
        type: "textarea",
        required: true,
        minLength: 20,
        value: article?.body,
      },
      {
        key: "kind",
        label: "Turi",
        type: "select",
        required: true,
        value: article?.kind ?? "NEWS",
        options: [
          { value: "NEWS", label: "Yangilik" },
          { value: "TIP", label: "Tavsiya" },
        ],
      },
      {
        key: "status",
        label: "Ilovada ko‘rinishi",
        type: "select",
        required: true,
        value: article?.status ?? "DRAFT",
        options: [
          { value: "DRAFT", label: "Qoralama" },
          { value: "PUBLISHED", label: "E’lon qilish" },
          { value: "ARCHIVED", label: "Arxivga olish" },
        ],
      },
    ];
    action(
      article ? "Maqolani tahrirlash" : "Yangilik yoki tavsiya yozish",
      article ? `/superadmin/articles/${article.id}` : "/superadmin/articles",
      article ? { version: article.version } : {},
      fields,
      article ? "PATCH" : "POST",
    );
  }
  return (
    <>
      <PageHeading
        title="Yangilik va tavsiyalar"
        subtitle="E’lon qilingan maqolalar Android bosh sahifasida ko‘rinadi."
      >
        <AddButton onClick={() => edit()}>Maqola yozish</AddButton>
      </PageHeading>
      <DataPanel
        path="/superadmin/articles"
        title="Maqolalar"
        renderRow={(r) => (
          <FeedItem
            icon={
              r.kind === "NEWS" ? (
                <FileText size={21} />
              ) : (
                <Lightbulb size={21} />
              )
            }
            title={r.title}
            status={<Badge value={r.status} />}
            meta={
              <>
                <span>{r.kind === "NEWS" ? "Yangilik" : "Tavsiya"}</span>
                <span>
                  {r.publishedAt
                    ? `E’lon qilingan: ${date(r.publishedAt)}`
                    : "Qoralama"}
                </span>
              </>
            }
            actions={<Act onClick={() => edit(r)}>Tahrirlash</Act>}
          >
            <p>{r.summary}</p>
          </FeedItem>
        )}
      />
    </>
  );
}
