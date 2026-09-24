export const BULK_USER_TEMPLATE_FILENAME = "mecure-bulk-users-template.csv";

export const BULK_USER_TEMPLATE_CSV = [
  "fullName,email,phoneNumber,password,department,designation,userRole",
  "Ada Okonkwo,ada.okonkwo@example.com,08031234567,TempPass#2026,SALES,Medical Rep,LEARNER",
  "Chinedu Bello,,08039876543,TempPass#2026,MARKETING,Field Rep,LEARNER",
  "",
].join("\n");

export function downloadBulkUserTemplate() {
  const blob = new Blob([BULK_USER_TEMPLATE_CSV], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = BULK_USER_TEMPLATE_FILENAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
