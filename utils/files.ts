"use client";

export async function filesToDataUrls(files: FileList | File[] | null) {
  const items = files ? Array.from(files) : [];

  return Promise.all(
    items.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ""));
          reader.onerror = () => reject(new Error("File upload failed."));
          reader.readAsDataURL(file);
        }),
    ),
  );
}
