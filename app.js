const claimInput = document.getElementById("claim");
const checkBtn = document.getElementById("checkBtn");
const errorBox = document.getElementById("error");
const results = document.getElementById("results");

document.querySelectorAll(".example").forEach(btn => {
  btn.addEventListener("click", () => {
    claimInput.value = btn.dataset.claim;
    claimInput.focus();
  });
});

document.getElementById("resetBtn").addEventListener("click", () => {
  results.classList.add("hidden");
  claimInput.value = "";
  claimInput.focus();
  window.scrollTo({top: 0, behavior: "smooth"});
});

checkBtn.addEventListener("click", verify);
claimInput.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") verify();
});

async function verify() {
  const claim = claimInput.value.trim();
  errorBox.textContent = "";
  if (claim.length < 8) {
    errorBox.textContent = "Écris une affirmation un peu plus précise (au moins 8 caractères).";
    return;
  }
  checkBtn.disabled = true;
  checkBtn.innerHTML = "<span>Recherche des vérifications…</span><b>⌛</b>";
  results.classList.remove("hidden");
  document.getElementById("submittedClaim").textContent = claim;
  document.getElementById("verdictTitle").textContent = "Recherche en cours";
  document.getElementById("verdictText").textContent = "Recherche dans les vérifications publiées…";
  document.getElementById("verdictTag").textContent = "EN COURS";
  document.getElementById("verdictIcon").textContent = "…";
  document.getElementById("sources").innerHTML = "";
  results.scrollIntoView({behavior:"smooth", block:"start"});

  try {
    const response = await fetch("/api/check", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({claim})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "La recherche n'a pas fonctionné.");
    renderResult(data);
  } catch (err) {
    document.getElementById("verdictTitle").textContent = "Vérification indisponible";
    document.getElementById("verdictText").textContent = err.message;
    document.getElementById("verdictTag").textContent = "ERREUR";
    document.getElementById("verdictIcon").textContent = "!";
  } finally {
    checkBtn.disabled = false;
    checkBtn.innerHTML = "<span>Vérifier les faits</span><b>→</b>";
  }
}

function renderResult(data) {
  const title = document.getElementById("verdictTitle");
  const text = document.getElementById("verdictText");
  const tag = document.getElementById("verdictTag");
  const icon = document.getElementById("verdictIcon");
  const card = document.getElementById("verdictCard");
  const sources = document.getElementById("sources");
  const list = data.claims || [];
  document.getElementById("sourceCount").textContent = `${list.length} résultat${list.length > 1 ? "s" : ""}`;

  if (!list.length) {
    title.textContent = "Aucune vérification trouvée";
    text.textContent = "Cela ne signifie pas que l'affirmation est fausse. Nous n'avons pas trouvé de vérification publiée correspondante dans la base consultée.";
    tag.textContent = "NON ÉTABLI";
    icon.textContent = "?";
  } else {
    const ratings = list.map(x => (x.claimReview || []).map(r => r.textualRating || "").join(" ")).join(" ").toLowerCase();
    const hasFalse = /false|faux|incorrect|pants on fire|mensonger/.test(ratings);
    const hasTrue = /true|vrai|correct|accurate/.test(ratings);
    if (hasFalse && hasTrue) {
      title.textContent = "Résultats contradictoires";
      text.textContent = "Les vérificateurs trouvés ne donnent pas tous la même conclusion. Consulte les articles et leur contexte avant de trancher.";
      tag.textContent = "À NUANCER"; icon.textContent = "±";
    } else if (hasFalse) {
      title.textContent = "Des vérifications concluent que c'est faux";
      text.textContent = "Au moins une vérification publiée classe une affirmation correspondante comme fausse. Vérifie qu'elle porte exactement sur la même affirmation et le même contexte.";
      tag.textContent = "FAUX SELON SOURCE"; icon.textContent = "×";
    } else if (hasTrue) {
      title.textContent = "Des vérifications concluent que c'est vrai";
      text.textContent = "Au moins une vérification publiée classe une affirmation correspondante comme vraie. Consulte les détails et la date de l'enquête.";
      tag.textContent = "VRAI SELON SOURCE"; icon.textContent = "✓";
    } else {
      title.textContent = "Vérifications trouvées — verdict nuancé";
      text.textContent = "Des articles de vérification existent, mais leur évaluation ne correspond pas clairement à vrai ou faux. Lis les conclusions originales.";
      tag.textContent = "NUANCÉ"; icon.textContent = "!";
    }
  }

  list.forEach(item => {
    (item.claimReview || []).forEach(review => {
      const article = document.createElement("article");
      article.className = "source";
      const top = document.createElement("div"); top.className = "source-top";
      const name = document.createElement("span"); name.className = "source-name"; name.textContent = review.publisher?.name || "Organisme de vérification";
      const rating = document.createElement("span"); rating.className = "rating"; rating.textContent = review.textualRating || "Conclusion non précisée";
      top.append(name, rating);
      const summary = document.createElement("p"); summary.textContent = item.text || item.claim || "Affirmation vérifiée par cette source.";
      const meta = document.createElement("p"); meta.textContent = review.title ? `Article : ${review.title}` : "";
      article.append(top, summary, meta);
      if (review.url) {
        const link = document.createElement("a"); link.href = review.url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = "Lire la vérification originale ↗";
        article.append(link);
      }
      sources.append(article);
    });
  });
}
