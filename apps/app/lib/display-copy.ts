export function friendlyOperationalText(value: string | null | undefined) {
  if (!value) return "";

  return value
    .replace(/owner attention needed/gi, "Needs your attention")
    .replace(/business approval needed/gi, "Your approval is needed")
    .replace(/owner confirmation/gi, "your confirmation")
    .replace(
      /no owner decision is currently required/gi,
      "No decision from you is currently required"
    )
    .replace(/owner decision/gi, "your decision")
    .replace(/owner input/gi, "your input")
    .replace(/owner action/gi, "action from you")
    .replace(/business approval/gi, "your approval")
    .replace(/business decision/gi, "your decision")
    .replace(/judgment needed/gi, "Your input needed")
    .replace(/recovery needed/gi, "Needs follow-up")
    .replace(/agent handling/gi, "Oak is handling")
    .replace(/owner authorized the change/gi, "You approved the change")
    .replace(/owner declined the change/gi, "You declined the change")
    .replace(/owner confirmed/gi, "You confirmed")
    .replace(/owner replied/gi, "You replied")
    .replace(/owner took over/gi, "You took over")
    .replace(/returned to (?:the )?agent/gi, "Returned to Oak")
    .replace(/without owner involvement/gi, "without needing you")
    .replace(/while the owner has control/gi, "while you’re replying")
    .replace(/has not escalated it/gi, "doesn’t need your help yet")
    .replace(/the business owner/gi, "you")
    .replace(/the owner/gi, "you")
    .replace(/the agent/gi, "Oak")
    .replace(/\bagent\b/gi, "Oak");
}
