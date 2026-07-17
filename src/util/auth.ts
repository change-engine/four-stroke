export interface Viewer {
  name: string;
  picture: string | null;
}

export const getCookieValue = (request: Request, name: string): string | null => {
  const cookieHeader = request.headers.get("Cookie");

  if (!cookieHeader) {
    return null;
  }

  const prefix = `${name}=`;
  const cookie = cookieHeader.split(";").find((part) => part.trim().startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.trim().slice(prefix.length)) : null;
};

const decodeBase64Url = (value: string): string => {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
};

export const parseViewerFromAccessToken = (accessToken: string): Viewer | null => {
  const [, payload] = accessToken.split(".");

  if (!payload) {
    return null;
  }

  try {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const claims = JSON.parse(decodeBase64Url(payload)) as {
      email?: unknown;
      name?: unknown;
      picture?: unknown;
    };
    const name =
      typeof claims.name === "string" && claims.name.trim().length > 0
        ? claims.name
        : typeof claims.email === "string" && claims.email.trim().length > 0
          ? claims.email
          : "Signed in";
    const picture =
      typeof claims.picture === "string" && claims.picture.trim().length > 0
        ? claims.picture
        : null;

    return { name, picture };
  } catch {
    return null;
  }
};
