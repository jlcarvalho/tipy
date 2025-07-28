"use client";
import "./app.css";
import "@copilotkit/react-ui/styles.css";

import {
  CopilotPopup,
  CopilotSidebar,
  RenderSuggestion,
  useChatContext,
  useCopilotChatSuggestions,
  type CopilotChatSuggestion,
  type HeaderProps,
  type RenderSuggestionsListProps,
  type UserMessageProps,
} from "@copilotkit/react-ui";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router";

import { CopilotKit } from "@copilotkit/react-core";
import type { Route } from "./+types/root";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

function Header({}: HeaderProps) {
  const { setOpen, icons, labels } = useChatContext();

  return (
    <div className="flex justify-between items-center p-4 bg-blue-500 text-white">
      <div className="text-lg">{labels.title}</div>
      <div className="w-24 flex justify-end">
        <button onClick={() => setOpen(false)} aria-label="Close">
          {icons.headerCloseIcon}
        </button>
      </div>
    </div>
  );
}

const CustomSuggestionsList = ({
  suggestions,
  onSuggestionClick,
}: RenderSuggestionsListProps) => {
  return (
    <div className="suggestions flex flex-col gap-2 p-4">
      <h1>Try asking:</h1>
      <div className="flex gap-2">
        {suggestions.map((suggestion: CopilotChatSuggestion, index) => (
          <RenderSuggestion
            key={index}
            title={suggestion.title}
            message={suggestion.message}
            partial={suggestion.partial}
            className="rounded-md border border-gray-500 bg-white px-2 py-1 shadow-md"
            onClick={() => onSuggestionClick(suggestion.message)}
          />
        ))}
      </div>
    </div>
  );
};

export function Chat({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <CopilotPopup
        Header={Header}
        markdownTagRenderers={{
          code: ({ children, ...rest }) => <span {...rest}>${children}$</span>,
        }}
        labels={{
          initial: "Hello! How can I help you today?",
          title: "Tipy",
          placeholder: "Ask me anything!",
          stopGenerating: "Stop",
          regenerateResponse: "Regenerate",
        }}
      />
    </>
  );
}
