import { Links as RouterLinks } from "react-router";

/**
 * React Router's `Links`, without the document's nonce. An app's layout uses this one.
 *
 * `ServerRouter` hands its nonce to every link, and a browser blanks a nonce attribute
 * Once the page has it, so the client renders a link without one where the server's now
 * Reads "". `Scripts` tells React to expect that; `Links` does not, and every page logged
 * A hydration mismatch in dev. A stylesheet is allowed by its host, not by nonce, so an
 * Empty one costs nothing.
 */
export const Links = (): React.ReactNode => <RouterLinks nonce="" />;
