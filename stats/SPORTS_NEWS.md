# Sports Stories: Sourcing and Ethical Rewriting

## Can you pull sports stories and rewrite them for ethical use?

**Yes.** Here’s a practical approach.

### 1. Sources (free / low-barrier)

| Source | Format | Notes |
|--------|--------|-------|
| [ESPN RSS](https://www.espn.com/espn/rss/nba/news) | RSS/XML | NBA, NFL, NHL, MLB feeds available |
| Associated Press (AP) Sports | API/RSS | Often requires license |
| Sports Data APIs | JSON | Stats + brief descriptions, not full stories |

**ESPN RSS example:**
```
https://www.espn.com/espn/rss/nba/news
https://www.espn.com/espn/rss/nfl/news
https://www.espn.com/espn/rss/nhl/news
https://www.espn.com/espn/rss/mlb/news
```

### 2. Ethical rewriting

- **Don’t copy-paste.** Use the article as a factual reference and write your own text.
- **Use facts, not expression.** Facts (e.g., “Team X won 110–93”) are generally not copyrightable; wording and structure often are.
- **Rewrite, don’t paraphrase.** Change sentence structure, word choice, tone, and organization so the result is clearly your own.
- **Attribute when appropriate.** Citing the source (e.g., “based on ESPN reporting”) is good practice.
- **Check ToS.** ESPN’s Terms of Service apply to their feeds; ensure your use complies.

### 3. Implementation (built-in)

```
The project includes: RSS fetcher, optional LLM rewrite, storage, web UI. See README.
```

**Needed:**
1. RSS fetcher (implemented)
2. LLM API key
3. Rewrite prompt: “Write a brief, original news summary using these facts: …”
4. Storage for rewritten articles

### 4. Risks and mitigations

- **Copyright:** Rewriting reduces similarity; heavy paraphrasing can still infringe.
- **Rate limits:** Throttle fetches; cache aggressively.
- **Cost:** LLM usage per article; batching and caching help.

---

*This doc is guidance only. Consult a legal professional for your use case.*
