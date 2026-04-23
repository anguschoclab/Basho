import React from "react";
import { ClickableName } from "./ClickableName";

interface MentionTextProps {
  text: string;
  className?: string;
}

/**
 * MentionText parses and renders a string containing [[type:id:label]] tags
 * as interactive ClickableName components mixed with plain text.
 */
export function MentionText({ text, className }: MentionTextProps) {
  if (!text) return null;

  // Regex to find [[type:id:label]]
  const mentionRegex = /\[\[(rikishi|stable|oyakata):([^:]+):([^\]]+)\]\]/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const type = match[1] as "rikishi" | "stable" | "oyakata";
    const id = match[2];
    const name = match[3];

    parts.push(
      <ClickableName
        key={`${type}-${id}-${match.index}`}
        type={type}
        id={id}
        name={name}
        className="font-semibold text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
      />
    );

    lastIndex = mentionRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}
