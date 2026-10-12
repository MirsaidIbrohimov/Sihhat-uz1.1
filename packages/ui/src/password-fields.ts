import type { Field } from "./components";
export const newPasswordFields: Field[] = [
  {
    key: "new_password",
    label: "Yangi parol",
    type: "password",
    required: true,
    minLength: 12,
    maxLength: 128,
    hint: "Kamida 12 belgi, katta va kichik harf hamda raqam.",
  },
  {
    key: "confirm_password",
    label: "Parolni takrorlang",
    type: "password",
    required: true,
    minLength: 12,
    maxLength: 128,
  },
];
