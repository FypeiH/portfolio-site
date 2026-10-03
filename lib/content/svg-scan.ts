import { DOMParser, type Node as XmlNode } from "@xmldom/xmldom";
import { scanRenderedOutput, type OutputHit } from "./output-scan";

const ELEMENT = 1;
const TEXT = 3;
const CDATA = 4;
/** Elements whose descendant text renders as one line (`<text>T<tspan>ODO</tspan></text>` reads "TODO"). */
const TEXT_BLOCKS = new Set(["text", "title", "desc", "style", "p", "span", "div", "foreignObject"]);

/**
 * What a served SVG can show or carry (QA FIL-8 r3 S1/S2): the text of every text block (descendant
 * text joined, as drawn), every other text node, and every attribute value. Comments are skipped
 * (never drawn; the diagrams keep their `src-sha256` there). Unparseable SVG is read as plain text.
 */
export function svgTextRuns(xml: string): string[] {
  const runs: string[] = [];
  let doc: ReturnType<DOMParser["parseFromString"]>;
  try {
    doc = new DOMParser({ onError: (level, message) => { if (level !== "warning") throw new Error(message); } }).parseFromString(xml, "image/svg+xml");
  } catch {
    return [xml];
  }
  const textOf = (node: XmlNode): string => {
    if (node.nodeType === TEXT || node.nodeType === CDATA) return node.nodeValue ?? "";
    if (node.nodeType !== ELEMENT) return "";
    return Array.from(node.childNodes, textOf).join("");
  };
  const visit = (node: XmlNode): void => {
    if (node.nodeType === TEXT || node.nodeType === CDATA) {
      runs.push(node.nodeValue ?? "");
      return;
    }
    if (node.nodeType !== ELEMENT) return;
    const element = node as unknown as { localName: string; attributes: ArrayLike<{ value: string }> };
    for (const attribute of Array.from(element.attributes)) runs.push(attribute.value);
    if (TEXT_BLOCKS.has(element.localName)) runs.push(textOf(node));
    for (const child of Array.from(node.childNodes)) {
      // A text block's own text nodes are already in its joined run; its child elements still have attributes.
      if (TEXT_BLOCKS.has(element.localName) && (child.nodeType === TEXT || child.nodeType === CDATA)) continue;
      visit(child);
    }
  };
  if (doc.documentElement) visit(doc.documentElement as unknown as XmlNode);
  return runs.filter((run) => run.trim() !== "");
}

/** Placeholder markers in a served SVG (same rules as the rendered-output scan, no exemptions). */
export function scanSvgOutput(file: string, xml: string): OutputHit[] {
  const seen = new Set<string>();
  return svgTextRuns(xml)
    .flatMap((run) => scanRenderedOutput(file, run))
    .filter((hit) => !seen.has(hit.text) && (seen.add(hit.text), true));
}
