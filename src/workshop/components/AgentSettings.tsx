import { useRef, useState, type FormEvent } from "react";
import { setWorkshopAgentConfig } from "@/api/workshop";
import { workshopErrorMessage } from "@/workshop/lib/errors";
import {
  WORKSHOP_AGENT_MODELS,
  WORKSHOP_DEFAULT_AGENT_CONFIG,
  WORKSHOP_REASONING_EFFORTS,
  type WorkshopAgentConfig,
  type WorkshopAgentModel,
  type WorkshopReasoningEffort,
} from "@/workshop/types";

export function AgentSettings({ config }: { config: WorkshopAgentConfig | null }) {
  const resolved = config ?? WORKSHOP_DEFAULT_AGENT_CONFIG;
  const [model, setModel] = useState<WorkshopAgentModel>(resolved.model);
  const [reasoningEffort, setReasoningEffort] = useState<WorkshopReasoningEffort>(resolved.reasoningEffort);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutationId = useRef(crypto.randomUUID());

  function changed() {
    setSaved(false);
    setError(null);
    mutationId.current = crypto.randomUUID();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await setWorkshopAgentConfig({ model, reasoningEffort }, mutationId.current);
      setSaved(true);
      mutationId.current = crypto.randomUUID();
    } catch (failure) {
      setError(workshopErrorMessage(failure, "Could not save the agent settings."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="agent-settings" data-testid="agent-settings">
      <summary aria-label="Agent settings" title="Agent settings">⚙</summary>
      <form onSubmit={(event) => void submit(event)}>
        <strong>Agent settings</strong>
        <p>Applies to tickets claimed after you save. Active agents keep their current setting.</p>
        <label htmlFor="workshop-agent-model">Model</label>
        <select id="workshop-agent-model" value={model} onChange={(event) => {
          setModel(event.target.value as WorkshopAgentModel);
          changed();
        }}>
          {WORKSHOP_AGENT_MODELS.map((value) => <option key={value} value={value}>{value.replace("gpt-5.6-", "")}</option>)}
        </select>
        <label htmlFor="workshop-agent-effort">Reasoning</label>
        <select id="workshop-agent-effort" value={reasoningEffort} onChange={(event) => {
          setReasoningEffort(event.target.value as WorkshopReasoningEffort);
          changed();
        }}>
          {WORKSHOP_REASONING_EFFORTS.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <button className="primary-button compact" type="submit" disabled={saving}>{saving ? "Saving…" : "Save for next agents"}</button>
        {saved && <span className="settings-saved" role="status">Saved ✓</span>}
        {error && <span className="form-error" role="alert">{error}</span>}
      </form>
    </details>
  );
}
