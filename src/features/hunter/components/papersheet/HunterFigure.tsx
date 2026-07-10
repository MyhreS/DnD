import { F, Ta, St } from "./sheetPrimitives";
import { Info } from "./InfoDot";

/** Page 2's paper-doll: the hunter line-art with dashed leader lines to the
 * five gear plaques (head gear, scarf, main armor, gloves, boots). */
export function HunterFigure() {
  return (
    <div className="figure">
      <svg viewBox="0 0 950 1200" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <g stroke="#211d17" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" transform="translate(475 0) scale(0.68 1) translate(-475 0)">
          {/* hat */}
          <path d="M402 150 C 406 76 430 62 475 62 C 520 62 544 76 548 150" fill="rgba(255,255,255,.4)" />
          <path d="M348 152 C 400 138 550 138 602 152 C 550 172 400 172 348 152 Z" fill="rgba(255,255,255,.55)" />
          {/* jaw */}
          <path d="M442 178 Q 475 206 508 178" />
          {/* scarf */}
          <path d="M424 216 Q 475 244 526 216 L 528 250 Q 475 280 422 250 Z" fill="rgba(255,255,255,.4)" />
          <path d="M520 252 C 546 300 542 330 522 366" />
          {/* coat body */}
          <path d="M338 282 C 322 420 302 590 288 768" />
          <path d="M612 282 C 628 420 648 590 662 768" />
          <path d="M288 768 Q 475 800 662 768" />
          <path d="M338 282 Q 475 258 612 282" />
          {/* lapels + opening */}
          <path d="M440 272 L 478 352 L 512 272" strokeWidth="5" />
          <path d="M478 352 L 484 768" strokeWidth="5" />
          {/* belt */}
          <path d="M330 486 L 620 486" strokeWidth="5" />
          <rect x="458" y="468" width="36" height="36" strokeWidth="5" fill="rgba(255,255,255,.5)" />
          {/* left sleeve + glove */}
          <path d="M338 284 C 306 380 288 470 276 548" />
          <path d="M362 312 C 340 396 326 474 318 552" />
          <path d="M274 550 L 320 556" />
          <path d="M272 556 C 262 596 266 630 292 640 C 314 645 322 610 318 560" fill="rgba(255,255,255,.4)" />
          {/* right sleeve + glove */}
          <path d="M612 284 C 644 380 662 470 674 548" />
          <path d="M588 312 C 610 396 624 474 632 552" />
          <path d="M676 550 L 630 556" />
          <path d="M678 556 C 688 596 684 630 658 640 C 636 645 628 610 632 560" fill="rgba(255,255,255,.4)" />
          {/* legs */}
          <path d="M405 776 L 398 950" />
          <path d="M545 776 L 552 950" />
          {/* boots */}
          <path d="M372 944 L 368 1058 C 336 1064 314 1080 318 1096 Q 321 1106 342 1106 L 428 1106 L 424 946" fill="rgba(255,255,255,.4)" />
          <path d="M578 944 L 582 1058 C 614 1064 636 1080 632 1096 Q 629 1106 608 1106 L 522 1106 L 526 946" fill="rgba(255,255,255,.4)" />
        </g>
        {/* leader lines — hidden on small screens, where the plaques leave
          * the doll and stack below it (there is nothing to point at). */}
        <g className="leaders" stroke="#8e1f1f" strokeWidth="3.5" strokeDasharray="10 9">
          <path d="M316 82 L 424 146" />
          <path d="M638 90 L 511 238" />
          <path d="M282 578 L 348 604" />
          <path d="M638 468 L 540 420" />
          <path d="M624 1064 L 546 1006" />
        </g>
        <g className="leaders" fill="#8e1f1f">
          <circle cx="424" cy="146" r="9" />
          <circle cx="511" cy="238" r="9" />
          <circle cx="348" cy="604" r="9" />
          <circle cx="540" cy="420" r="9" />
          <circle cx="546" cy="1006" r="9" />
        </g>
      </svg>
      <div className="plaque pl-head" data-step="4"><span className="plbl">HEAD GEAR <St n={4} /> <Info k="extras" /></span><F f="headGear" /></div>
      <div className="plaque pl-scarf" data-step="4"><span className="plbl">SCARF <St n={4} /> <Info k="extras" side="left" /></span><F f="scarf" /></div>
      <div className="plaque pl-gloves" data-step="4"><span className="plbl">GLOVES <St n={4} /> <Info k="extras" /></span><F f="gloves" /></div>
      <div className="plaque pl-main" data-step="4"><span className="plbl">MAIN ARMOR <St n={4} /> <Info k="mainArmor" side="left" /></span><Ta rows={3} f="mainArmor" /></div>
      <div className="plaque pl-boots" data-step="4"><span className="plbl">BOOTS <St n={4} /> <Info k="extras" side="left" /></span><F f="boots" /></div>
    </div>
  );
}
