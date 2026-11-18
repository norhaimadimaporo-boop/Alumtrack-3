/** Client helpers for the Messenger-style message edit/delete endpoints. */
async function mutateMessage(
  url: string,
  method: "PATCH" | "DELETE",
  body?: { message: string },
): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method,
      ...(method === "PATCH"
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body ?? {}),
          }
        : {}),
    });
    const result = (await response.json()) as { ok?: boolean };
    return response.ok && result.ok === true;
  } catch (error) {
    console.error("[chat] Message action failed:", error);
    return false;
  }
}

export function editMessage(messageId: number, text: string): Promise<boolean> {
  return mutateMessage(`/api/chat/messages/${messageId}`, "PATCH", { message: text });
}

export function deleteMessage(messageId: number): Promise<boolean> {
  return mutateMessage(`/api/chat/messages/${messageId}`, "DELETE");
}
