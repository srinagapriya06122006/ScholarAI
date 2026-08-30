import os
from dotenv import load_dotenv
load_dotenv()
import re
import json
import urllib.request
import urllib.parse
from datetime import date, datetime
from typing import List, Dict
from sqlalchemy.orm import Session
from .. import models, crud

# ─────────────────────────────────────────────
# Knowledge Base Document Corpus
# ─────────────────────────────────────────────
KNOWLEDGE_BASE = [
    {
        "id": "kb_nsp",
        "title": "National Scholarship Portal (NSP) — Merit Scholarship",
        "url": "https://scholarships.gov.in",
        "content": """
        The NSP Merit Scholarship offers up to ₹50,000 annually for undergraduate and postgraduate students from low-income families across India.
        Eligibility Requirements:
        - Minimum CGPA: 8.0 (or 80% equivalent in board exams).
        - Family Annual Income limit: ₹2,00,000 per annum (verified by Revenue Dept. Tahsildar certificate).
        - Required Documents: Aadhaar Card, Income Certificate, College Bonafide Certificate, 10th & 12th Marksheets.
        - Applicable Categories: General, BC, MBC, SC, ST across all Indian states.
        - Submission Deadline: August 31 annually.
        - No active arrears allowed for renewal.
        """
    },
    {
        "id": "kb_pragati",
        "title": "AICTE Pragati Scholarship for Girls",
        "url": "https://www.aicte-india.org/bureaus/rifd/pragati",
        "content": """
        The AICTE Pragati Scholarship provides ₹50,000 per annum for female students in Technical Degree or Diploma courses at AICTE-approved institutions.
        Eligibility Requirements:
        - Must be a Female student (mandatory gender criterion).
        - Admitted to 1st or 2nd year of UG degree/diploma (AICTE approved course).
        - Maximum 2 female children per family eligible.
        - Family Annual Income limit: ₹8,00,000 per annum.
        - Required Documents: College Admission Letter, Aadhaar, Income Certificate, Bank Passbook, Institution Bonafide.
        - Application Window: Opens annually in August/September.
        """
    },
    {
        "id": "kb_postmatric",
        "title": "Post-Matric Scholarship & First Generation Graduate Scheme",
        "url": "https://scholarships.gov.in/public/schemeData",
        "content": """
        Post-Matric Scholarship covers 100% tuition fees and maintenance allowance for SC/ST, BC/MBC, and First Generation Graduate students.
        Eligibility Requirements:
        - Category: SC/ST/OBC/MBC/Minority verified via official Community Certificate.
        - First Graduate status certified by Tahsildar Revenue Department.
        - Family Annual Income limits: ₹2,50,000 for SC/ST; ₹2,00,000 for BC/MBC.
        - No active arrears for annual renewal. Minimum 75% attendance required.
        - Required Documents: Community Certificate, Income Certificate, First Graduate Certificate, Marksheets.
        """
    },
    {
        "id": "kb_verification",
        "title": "ScholarAI Document Verification & OCR Engine",
        "url": None,
        "content": """
        Uploaded PDF & Image documents are processed via automated OCR (Optical Character Recognition) powered by Tesseract.
        How Verification Works:
        1. Text Extraction: Extracts text from Aadhaar, Income, Community, and Marksheet uploads.
        2. Field Matching: Parses Name, DOB, Gender, Income, Category, and CGPA using pattern recognition.
        3. Cross-Audit: Compares parsed values against Student Profile to catch name, income, or mark discrepancies.
        4. Status outcomes: Verified, Mismatch, Pending.
        """
    },
    {
        "id": "kb_financial_aid_faq",
        "title": "General Scholarship Policies & Rules FAQ",
        "url": "https://scholarships.gov.in",
        "content": """
        General Higher Education Scholarship Rules:
        - Merit-cum-Means: Scholarships awarded based on academic performance combined with family income limits.
        - Multiple Scholarships: Government schemes prohibit holding two government tuition scholarships simultaneously.
        - First Graduate Certificate: Issued by Revenue Department (Tahsildar) certifying no family member has completed a degree.
        - Renewal Criteria: Annual renewal requires maintaining minimum 75% attendance and clearing exams without arrears.
        """
    },
    {
        "id": "kb_eligibility_rules",
        "title": "Official Scholarship Eligibility Rulebook",
        "url": "https://scholarships.gov.in",
        "content": """
        General eligibility policies:
        1. Academic standing: No active arrears for renewal. Min CGPA: NSP=8.0, Pragati=7.5, First Graduate=7.0, State Post-Matric=6.0.
        2. Family Income verification: Certificate issued within last 6 months by Revenue Department.
        3. Income limits: NSP ₹2,00,000; Pragati ₹8,00,000; State Post-Matric SC/ST ₹2,50,000; BC/MBC ₹2,00,000.
        4. Simultaneous schemes: Students prohibited from receiving tuition fee benefits from more than one government scheme.
        """
    },
    {
        "id": "kb_document_guidelines",
        "title": "ScholarAI Document Submission & Upload Guidelines",
        "url": "https://scholarships.gov.in",
        "content": """
        Required Document Specifications:
        - Aadhaar Card: Name, DOB, gender, state, 12-digit UID visible. Name must exactly match profile.
        - Income Certificate: Parent's name, annual family income, tahsildar signature, issued within 6 months.
        - Community Certificate: Caste classification (SC, ST, BC, MBC, OBC) matching profile.
        - Marksheets (10th/12th/College): CGPA or aggregate percentage. Mismatch with profile will flag discrepancy.
        - Institution Bonafide: Required for NSP and Pragati to verify regular study status.
        """
    }
]

# Scholarship-specific required documents
SCHOLARSHIP_DOCUMENTS = {
    "nsp merit": ["Aadhaar Card", "Income Certificate (Tahsildar)", "College Bonafide Certificate", "10th Marksheet", "12th Marksheet"],
    "pragati": ["Aadhaar Card", "Income Certificate", "College Admission Letter", "Bank Passbook", "Institution Bonafide"],
    "post-matric": ["Community Certificate", "Income Certificate", "Marksheets (10th/12th)", "Bonafide Certificate"],
    "first graduate": ["Community Certificate", "First Graduate Certificate (Tahsildar)", "Income Certificate", "Aadhaar Card"],
    "sona": ["Aadhaar Card", "College ID / Bonafide Certificate", "10th Marksheet", "12th Marksheet"],
    "state": ["Community Certificate", "Income Certificate", "Aadhaar Card", "Marksheets"],
}

# Official source URLs per provider
PROVIDER_URLS = {
    "aicte": "https://www.aicte-india.org/bureaus/rifd/pragati",
    "nsp": "https://scholarships.gov.in",
    "national scholarship": "https://scholarships.gov.in",
    "sona college": "https://www.sonatech.ac.in",
    "state": "https://tnscholarships.gov.in",
    "tamil nadu": "https://tnscholarships.gov.in",
    "tamilnadu": "https://tnscholarships.gov.in",
}

# ─────────────────────────────────────────────
# Local Fallback (ONLY used when Gemini is unavailable)
# Gemini is the primary handler for casual + general queries.
# These are emergency safety nets, NOT a replacement for Gemini.
# ─────────────────────────────────────────────

CASUAL_FALLBACK = {
    "hello": "Hello! 👋 I'm ScholarAI — your AI scholarship advisor. Ask me about eligibility, deadlines, or documents!",
    "hi": "Hi there! 👋 I'm ScholarAI. How can I help you today?",
    "hey": "Hey! 👋 I'm ScholarAI. Try asking about your scholarship eligibility or upcoming deadlines!",
    "how are you": "I'm doing great! 😊 I'm ScholarAI — always ready to help with scholarships. What can I help you with?",
    "how r u": "I'm great, thanks! 😊 Ask me anything about scholarships, eligibility, or documents!",
    "thank you": "You're welcome! 😊 Let me know if you need anything else about scholarships!",
    "thanks": "You're welcome! Happy to help. 😊",
    "bye": "Goodbye! 👋 Good luck with your applications!",
    "who are you": "I am **ScholarAI** — an Agentic AI Scholarship Advisor built with:\n\n• **Matching Agent** — finds scholarships matching your profile\n• **OCR Agent** — reads uploaded certificates\n• **Verification Agent** — cross-checks documents vs. profile\n• **RAG Agent** — answers from a grounded knowledge base\n• **Supervisor Agent** — orchestrates everything\n\nPowered by Google Gemini AI + MySQL scholarship database.",
    "what can you do": "I can help you with:\n\n• ✔ Scholarship eligibility checks\n• ✔ Compare scholarships side-by-side\n• ✔ Deadline reminders with urgency indicators\n• ✔ Required documents per scholarship\n• ✔ Best scholarship recommendations\n• ✔ Profile improvement suggestions\n• ✔ Certificate verification via OCR\n• ✔ General knowledge questions\n\nTry: \"Why am I eligible?\" or \"Best scholarship for me\"",
}

# Intent classifier — routes queries to the right agent/pipeline
def _classify_intent(query: str) -> str:
    """Classify user query into: CURRENT_AFFAIRS, CASUAL, GENERAL_KNOWLEDGE, SCHOLARSHIP, or UNKNOWN."""
    q_lower = query.lower().strip()
    q_words = set(re.findall(r'\w+', q_lower))

    # 1. Scholarship FIRST (more specific — prevents false matches)
    sch_keywords = [
        "scholarship", "eligible", "eligibility", "deadline", "apply", "document",
        "nsp", "pragati", "marksheet", "income", "community", "caste", "aadhaar",
        "adhaar", "marks", "cgpa", "first graduate", "verify", "verification",
        "mismatch", "fee", "profile", "improve", "strength", "compare", "best",
        "recommend", "required documents", "upload", "certificate", "bonafide",
        "ocr", "aicte", "sona", "post-matric"
    ]
    # If it asks specifically about scholarship features/deadlines
    if any(k in q_lower for k in sch_keywords) and not any(k in q_lower for k in ["news", "chief minister", "prime minister", "collector", "district collector", "magistrate", "commissioner", "stock market", "recruitment process", "infosys", "tcs"]):
        return "SCHOLARSHIP"

    # 2. Current Affairs & Time-Sensitive Government / Official / News Information
    current_affairs_triggers = [
        "current", "latest", "today", "yesterday", "this week", "recently", "now",
        "2026", "upcoming", "latest update", "current affairs", "news", "headlines",
        "collector", "district collector", "magistrate", "commissioner", "superintendent of police", "sp", "dgp",
        "chief minister", "prime minister", "president", "governor", "election",
        "vice chancellor", "registrar", "stock market", "sensex", "nifty", "recruitment", "hiring update",
        "who is the chief minister", "who is the prime minister", "who is the pm", "who is the cm", "who is the collector",
        "who is the district collector", "current collector", "salem collector", "chennai collector", "district magistrate"
    ]
    if any(trigger in q_lower for trigger in current_affairs_triggers):
        return "CURRENT_AFFAIRS"

    # 3. Casual / conversational (use word boundaries for short words)
    multi_word_casual = [
        "how are you", "how r u", "good morning", "good evening", "good night",
        "thank you", "who are you", "what can you do", "tell me a joke",
        "any joke", "tell joke"
    ]
    for trigger in multi_word_casual:
        if trigger in q_lower:
            return "CASUAL"
    single_word_casual = {"hello", "hi", "hey", "thanks", "bye", "joke", "funny"}
    if q_words & single_word_casual:
        return "CASUAL"

    # 4. General knowledge (handled by Gemini)
    gen_patterns = [
        "what is", "explain", "define", "tell me about", "how does", "who is",
        "who was", "what are", "describe", "meaning of", "difference between",
        "how to", "why is", "when was", "where is", "can you explain"
    ]
    if any(p in q_lower for p in gen_patterns):
        return "GENERAL_KNOWLEDGE"

    # 5. Unknown — still try Gemini
    return "UNKNOWN"


def live_web_search(query: str, max_results: int = 5) -> List[Dict]:
    """Retrieve real-time live search context from official government domains (.nic.in), Google News RSS, and DDG."""
    results = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
    import ssl
    ctx = ssl._create_unverified_context()

    # 1. Direct Web Search (prioritizes official .nic.in / .gov.in portal pages)
    try:
        html_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
        req = urllib.request.Request(html_url, headers=headers)
        with urllib.request.urlopen(req, timeout=5, context=ctx) as resp:
            html_text = resp.read().decode("utf-8", errors="ignore")
            snippets = re.findall(r'<a class="result__snippet[^"]*"[^>]*>(.*?)</a>', html_text, re.DOTALL)
            urls = re.findall(r'<a class="result__url"[^>]*href="([^"]*)"[^>]*>(.*?)</a>', html_text, re.DOTALL)
            for i in range(min(len(snippets), len(urls), max_results)):
                raw_u, raw_t = urls[i]
                raw_s = snippets[i]
                clean_u = urllib.parse.unquote(raw_u)
                if "uddg=" in clean_u:
                    clean_u = clean_u.split("uddg=")[1].split("&")[0]
                clean_t = re.sub(r'<[^>]+>', '', raw_t).strip()
                clean_s = re.sub(r'<[^>]+>', '', raw_s).strip()
                if clean_s:
                    results.append({
                        "title": clean_t or "Official Portal Record",
                        "snippet": clean_s,
                        "url": clean_u
                    })
    except Exception:
        pass

    # 2. Google News RSS for live/current events / today news / headlines / official orders
    is_news = any(k in query.lower() for k in ["today", "latest", "news", "current", "stock", "update", "yesterday", "recently", "2026", "recruitment", "minister", "collector"])
    if is_news:
        try:
            encoded_q = urllib.parse.quote(query)
            rss_url = f"https://news.google.com/rss/search?q={encoded_q}&hl=en-IN&gl=IN&ceid=IN:en"
            req = urllib.request.Request(rss_url, headers=headers)
            with urllib.request.urlopen(req, timeout=4, context=ctx) as resp:
                xml_data = resp.read().decode("utf-8", errors="ignore")
                items = re.findall(r"<item>(.*?)</item>", xml_data, re.DOTALL)
                for item in items[:2]:
                    t_match = re.search(r"<title>(.*?)</title>", item, re.DOTALL)
                    l_match = re.search(r"<link>(.*?)</link>", item, re.DOTALL)
                    d_match = re.search(r"<pubDate>(.*?)</pubDate>", item, re.DOTALL)
                    if t_match:
                        title = t_match.group(1).replace("<![CDATA[", "").replace("]]>", "").strip()
                        link = l_match.group(1).strip() if l_match else "https://news.google.com"
                        pub_date = d_match.group(1).strip() if d_match else ""
                        results.append({
                            "title": title,
                            "snippet": f"News Headline ({pub_date}): {title}",
                            "url": link
                        })
        except Exception:
            pass

    # 3. Wikipedia API Search for factual background / dignitaries
    if len(results) < 2:
        try:
            wiki_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(query)}&utf8=&format=json"
            req = urllib.request.Request(wiki_url, headers=headers)
            with urllib.request.urlopen(req, timeout=4, context=ctx) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                search_items = data.get("query", {}).get("search", [])
                for item in search_items[:2]:
                    snippet_clean = re.sub(r"<[^>]+>", "", item.get("snippet", "")).strip()
                    if snippet_clean:
                        results.append({
                            "title": item.get("title", ""),
                            "snippet": snippet_clean,
                            "url": f"https://en.wikipedia.org/wiki/{urllib.parse.quote(item.get('title', ''))}"
                        })
        except Exception:
            pass

    return results[:max_results]


def search_knowledge_base(query: str, top_k: int = 3) -> List[Dict]:
    """Keyword relevance scoring to retrieve knowledge base context chunks."""
    words = [w.lower() for w in re.findall(r'\w+', query) if len(w) > 2]
    if not words:
        return KNOWLEDGE_BASE[:top_k]
    scored = []
    for doc in KNOWLEDGE_BASE:
        text = (doc["title"] + " " + doc["content"]).lower()
        score = sum(text.count(w) for w in words)
        scored.append((score, doc))
    scored.sort(key=lambda x: x[0], reverse=True)
    results = [doc for score, doc in scored[:top_k] if score > 0]
    return results if results else KNOWLEDGE_BASE[:top_k]


def call_gemini_api(prompt: str) -> str:
    """Call Google Gemini REST API with prompt grounding."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return ""
    gemini_models = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-2.5-flash"]
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 2048}
    }
    for m in gemini_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            import ssl
            ctx = ssl._create_unverified_context()
            with urllib.request.urlopen(req, timeout=20, context=ctx) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                candidates = res_data.get("candidates", [])
                if candidates:
                    text_content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    if text_content.strip():
                        return text_content.strip()
        except urllib.error.HTTPError as err:
            print(f"[Gemini API HTTPError {m}]: {err.code} - {err.read().decode('utf-8', errors='ignore')[:200]}")
            continue
        except Exception as err:
            print(f"[Gemini API Exception {m}]: {err}")
            continue
    return ""


def _format_amt(amt) -> str:
    if amt is None:
        return "Varies"
    if isinstance(amt, (int, float)):
        return f"₹{amt:,.0f}" if amt == int(amt) else f"₹{amt:,.2f}"
    s = str(amt).replace('â‚¹', '₹').replace('â€“', '-').replace('Rs.', '₹').strip()
    return s if s.startswith('₹') else f"₹{s}"


def _get_numeric_amount(amt) -> float:
    if isinstance(amt, (int, float)):
        return float(amt)
    if not amt:
        return 0.0
    s = str(amt).replace(',', '')
    match = re.search(r'\d+', s)
    if match:
        try:
            return float(match.group(0))
        except ValueError:
            pass
    return 0.0


def _get_deadline_urgency(deadline_str: str) -> tuple:
    """Return (emoji, label, days_remaining) based on deadline."""
    try:
        dl = datetime.strptime(str(deadline_str).strip(), "%Y-%m-%d").date()
        days_left = (dl - date.today()).days
        if days_left < 0:
            return "⚫", "Expired", days_left
        elif days_left <= 7:
            return "🔴", f"URGENT — {days_left} day(s) left", days_left
        elif days_left <= 30:
            return "🟡", f"{days_left} days remaining", days_left
        else:
            return "🟢", f"{days_left} days remaining", days_left
    except Exception:
        return "🔵", "Date not verified", 9999


def _get_official_url(match: dict, s_obj=None) -> str:
    """Return the official URL from the scholarship DB record, or best-effort from known providers."""
    if s_obj and s_obj.official_url and s_obj.official_url.strip():
        return s_obj.official_url.strip()
    name_lower = match.get("scholarship_name", "").lower()
    provider_lower = (match.get("provider") or "").lower()
    for key, url in PROVIDER_URLS.items():
        if key in name_lower or key in provider_lower:
            return url
    return "https://scholarships.gov.in"


def _get_scholarship_documents(scholarship_name: str, s_obj=None) -> List[str]:
    """Return the specific required documents for this scholarship."""
    if s_obj and s_obj.required_documents and s_obj.required_documents.strip():
        raw = s_obj.required_documents.strip()
        docs = [d.strip() for d in raw.split(",") if d.strip()]
        if docs:
            return docs
    name_lower = scholarship_name.lower()
    for key, docs in SCHOLARSHIP_DOCUMENTS.items():
        if key in name_lower:
            return docs
    return ["Aadhaar Card", "Income Certificate", "College Bonafide Certificate", "Marksheets (10th/12th)"]


def _build_sources_section(matches: list, db=None) -> str:
    """Build a clean, honest Sources section with URLs and today's date."""
    today_str = date.today().strftime("%d %b %Y")
    seen_urls = set()
    section = "SOURCES & GROUNDING RULES:\n"
    for m in matches:
        s_obj = db.query(models.Scholarship).filter(models.Scholarship.id == m["id"]).first() if db else None
        url = _get_official_url(m, s_obj)
        if url not in seen_urls:
            seen_urls.add(url)
            name = m.get("scholarship_name", "Scholarship")
            section += f"📖 {name} — {url}\n"
    section += f"📖 Data last verified: {today_str} (from ScholarAI scholarship database)\n"
    return section


# ─────────────────────────────────────────────
# Main RAG Response Generator
# ─────────────────────────────────────────────
def generate_rag_response(user_query: str, user_profile_summary: str = "", extra_context: str = "", db: Session = None, user_id: int = None) -> Dict:
    """Routes queries to structured intent responses or Gemini fallback."""
    q_lower = user_query.lower()
    today_str = date.today().strftime("%d %b %Y")

    # ─── INTENT 1: Why am I eligible? ───────────────────────────────────────
    if any(p in q_lower for p in ["why am i eligible", "why eligible", "am i eligible", "why am i"]):
        if db and user_id:
            from .matching_agent import ScholarshipMatchingAgent
            matches = ScholarshipMatchingAgent(db).match_scholarships(user_id)
            profile = crud.get_user_profile(db, user_id)

            eligible = [m for m in matches if m["status"] == "Eligible"]
            partial = [m for m in matches if m["status"] == "Partially Eligible"]
            rejected = [m for m in matches if m["status"] == "Rejected"]

            message = "✔ Profile checked\n✔ All scholarship criteria evaluated\n\n"
            message += f"**Based on your current profile, you appear eligible for {len(eligible)} scholarship(s)**"
            if partial:
                message += f" and potentially eligible for {len(partial)} more."
            message += "\n\n"

            # Eligible scholarships
            for m in eligible:
                s_obj = db.query(models.Scholarship).filter(models.Scholarship.id == m["id"]).first()
                emoji, urgency_label, _ = _get_deadline_urgency(m["deadline"])
                message += f"**{m['scholarship_name']}** — 🎯 Match: {m['match_percentage']}%\n"
                for r in m["reasons"]:
                    message += f"  {r}\n"
                message += f"  💰 Funding: {_format_amt(m['amount'])} | {emoji} Deadline: {m['deadline']} ({urgency_label})\n\n"

            # Partially eligible
            if partial:
                message += "**Potentially Eligible (additional verification needed):**\n"
                for m in partial:
                    message += f"  • {m['scholarship_name']} — Match: {m['match_percentage']}%\n"
                message += "\n"

            # Ineligible breakdown
            if rejected:
                message += "**Not Eligible:**\n"
                for m in rejected:
                    failed = [r for r in m["reasons"] if r.startswith("❌")]
                    message += f"  • {m['scholarship_name']}: {failed[0] if failed else 'Criteria not met'}\n"
                message += "\n"

            message += "⚠ Eligibility is based on profile data currently available in ScholarAI. Final eligibility is determined by the respective scholarship authority.\n\n"
            message += _build_sources_section(eligible + partial, db)
            message += "\n[View Eligible Scholarships →] [Upload Documents →]"

            return {"answer": message, "citations": [{"title": m["scholarship_name"], "id": m["id"]} for m in eligible], "confidence": "HIGH"}

    # ─── INTENT 2: Compare scholarships ─────────────────────────────────────
    if "compare" in q_lower and "scholarship" in q_lower:
        if db and user_id:
            from .matching_agent import ScholarshipMatchingAgent
            matches = ScholarshipMatchingAgent(db).match_scholarships(user_id)

            message = "✔ Scholarship database searched\n✔ Profile matched against all schemes\n\n"
            message += "Here is the detailed comparison of available scholarships:\n\n"

            message += "| Scholarship | Match | Amount | Deadline | Status |\n"
            message += "| --- | --- | --- | --- | --- |\n"
            for m in matches:
                emoji, _, _ = _get_deadline_urgency(m["deadline"])
                message += f"| {m['scholarship_name']} | {m['match_percentage']}% | {_format_amt(m['amount'])} | {emoji} {m['deadline']} | {m['status']} |\n"

            message += "\n"
            message += _build_sources_section(matches[:3], db)
            message += "\n[View Eligible Scholarships →]"
            return {"answer": message, "citations": [], "confidence": "HIGH"}

    # ─── INTENT 3: Deadline reminder ────────────────────────────────────────
    if "deadline" in q_lower:
        if db and user_id:
            from .matching_agent import ScholarshipMatchingAgent
            matches = ScholarshipMatchingAgent(db).match_scholarships(user_id)
            eligible_matches = [m for m in matches if m["status"] in ("Eligible", "Partially Eligible")]

            message = "✔ Scholarship database searched\n\n"
            message += "**Upcoming Scholarship Deadlines (your eligible schemes):**\n\n"

            sorted_matches = sorted(eligible_matches, key=lambda m: _get_deadline_urgency(m["deadline"])[2])
            for m in sorted_matches:
                emoji, urgency_label, _ = _get_deadline_urgency(m["deadline"])
                message += f"{emoji} **{m['scholarship_name']}** — {m['deadline']} ({urgency_label})\n"

            if not sorted_matches:
                message += "No eligible scholarships found with upcoming deadlines.\n"

            message += f"\n🔴 = Urgent (< 7 days)  🟡 = Soon (< 30 days)  🟢 = Ample time  ⚫ = Expired\n"
            message += f"\nDeadline data sourced from ScholarAI database. Last verified: {today_str}\n\n"
            message += _build_sources_section(eligible_matches[:3], db)
            message += "\n[View Eligible Scholarships →]"
            return {"answer": message, "citations": [], "confidence": "HIGH"}

    # ─── INTENT 4: Improve my profile ───────────────────────────────────────
    if any(p in q_lower for p in ["improve my profile", "improve profile", "how can i improve", "strengthen my profile"]):
        if db and user_id:
            profile = crud.get_user_profile(db, user_id)
            cgpa = profile.cgpa or 0.0
            income = profile.annualIncome

            # Calculate scholarship eligibility completeness (only required fields)
            elig_required = {
                "CGPA": profile.cgpa is not None,
                "Annual Income": profile.annualIncome is not None,
                "Category": bool(profile.category),
                "Gender": bool(profile.gender),
                "State": bool(profile.state),
                "Degree": bool(profile.degree),
            }
            elig_filled = sum(elig_required.values())
            elig_pct = int((elig_filled / len(elig_required)) * 100)

            # Optional profile fields
            optional_missing = []
            if not profile.mobileNumber:
                optional_missing.append("Mobile Number")

            # Documents
            docs = db.query(models.Document).filter(models.Document.user_id == user_id).all()
            uploaded_doc_types = [d.document_type for d in docs]
            all_req_docs = ["aadhaar", "income", "community", "college", "tenth", "twelfth"]
            missing_docs = [d.title() for d in all_req_docs if d not in uploaded_doc_types]

            message = "✔ Profile analysed\n\n"
            message += f"**Scholarship Eligibility Profile: {elig_pct}%**\n"
            for field, present in elig_required.items():
                message += f"  {'✔' if present else '✗'} {field}\n"
            message += "\n"

            if optional_missing:
                message += f"**Optional profile fields not yet filled:** {', '.join(optional_missing)}\n"
                message += "These are not required for eligibility but may be needed for applications.\n\n"

            message += "**Areas to improve:**\n\n"
            if cgpa < 9.0:
                message += f"• CGPA: Currently {cgpa}. Maintaining 9.0+ strengthens eligibility for high-value schemes.\n"
            if missing_docs:
                message += f"• Documents: Upload missing — {', '.join(missing_docs)}.\n"
            else:
                message += "• Documents: All required documents uploaded. ✔\n"

            message += "\n[Edit Profile →] [Upload Documents →]"
            return {"answer": message, "citations": [], "confidence": "HIGH"}

    # ─── INTENT 5: Required documents ───────────────────────────────────────
    if any(p in q_lower for p in ["required documents", "required document", "what documents", "documents needed", "which documents"]):
        if db and user_id:
            from .matching_agent import ScholarshipMatchingAgent
            matches = ScholarshipMatchingAgent(db).match_scholarships(user_id)
            eligible_matches = [m for m in matches if m["status"] in ("Eligible", "Partially Eligible")]

            message = "✔ Verification guidelines checked\n\n"

            if eligible_matches:
                message += "**Required documents per eligible scholarship:**\n\n"
                for m in eligible_matches:
                    s_obj = db.query(models.Scholarship).filter(models.Scholarship.id == m["id"]).first()
                    docs = _get_scholarship_documents(m["scholarship_name"], s_obj)
                    message += f"**{m['scholarship_name']}**\n"
                    for doc in docs:
                        message += f"  ✔ {doc}\n"
                    message += "\n"
            else:
                # Generic fallback
                message += "**General documents required for most scholarship applications:**\n\n"
                message += "• Aadhaar Card — Must clearly show full name, DOB, gender, and state.\n"
                message += "• Income Certificate — Issued by Revenue Department (Tahsildar) with annual income.\n"
                message += "• Community Certificate — Required for OBC, SC, ST, MBC, and BC quota reservations.\n"
                message += "• 10th & 12th Marksheets — For academic eligibility verification.\n"
                message += "• College ID / Bonafide Certificate — Shows current degree course & CGPA.\n\n"

            message += "⚠ Document requirements vary by scholarship. Always verify with the official scholarship portal.\n\n"
            message += f"SOURCES & GROUNDING RULES:\n"
            message += f"📖 National Scholarship Portal (NSP) — https://scholarships.gov.in\n"
            message += f"📖 Data last verified: {today_str}\n"
            message += "\n[Upload Documents →]"
            return {
                "answer": message,
                "citations": [{"title": "National Scholarship Portal Guidelines", "url": "https://scholarships.gov.in"}],
                "confidence": "HIGH"
            }
        else:
            message = "✔ Verification guidelines checked\n\n"
            message += "**General documents required for most scholarship applications:**\n\n"
            message += "• Aadhaar Card — Must clearly show full name, DOB, gender, and state.\n"
            message += "• Income Certificate — Issued by Revenue Department (Tahsildar) with annual income.\n"
            message += "• Community Certificate — Required for OBC, SC, ST, MBC, and BC quota reservations.\n"
            message += "• 10th & 12th Marksheets — For academic eligibility verification.\n"
            message += "• College ID / Bonafide Certificate — Shows current degree course & CGPA.\n\n"
            message += f"SOURCES & GROUNDING RULES:\n📖 National Scholarship Portal — https://scholarships.gov.in\n📖 Data last verified: {today_str}\n"
            message += "\n[Upload Documents →]"
            return {"answer": message, "citations": [], "confidence": "HIGH"}

    # ─── INTENT 6: Best scholarship / Which scholarship first ───────────────
    if any(p in q_lower for p in ["best scholarship", "which scholarship", "top scholarship", "recommend", "should i apply"]):
        if db and user_id:
            from .matching_agent import ScholarshipMatchingAgent
            matches = ScholarshipMatchingAgent(db).match_scholarships(user_id)
            eligible_matches = [m for m in matches if m["status"] == "Eligible"]

            if not eligible_matches:
                eligible_matches = [m for m in matches if m["status"] == "Partially Eligible"]

            message = "✔ Profile checked\n✔ All scholarship criteria evaluated\n✔ Multi-factor ranking applied\n\n"

            if eligible_matches:
                # Rank by: match score (40%) + funding (30%) + deadline urgency (30%)
                def rank_score(m):
                    _, _, days_left = _get_deadline_urgency(m["deadline"])
                    urgency = max(0, 100 - days_left) if days_left >= 0 else 0  # higher = more urgent
                    num_amt = _get_numeric_amount(m.get("numeric_amount") or m.get("amount"))
                    funding_norm = min(num_amt / 100000 * 100, 100)
                    return 0.40 * m["match_percentage"] + 0.30 * funding_norm + 0.30 * urgency

                eligible_matches = sorted(eligible_matches, key=rank_score, reverse=True)
                top = eligible_matches[0]
                s_obj = db.query(models.Scholarship).filter(models.Scholarship.id == top["id"]).first()
                emoji, urgency_label, _ = _get_deadline_urgency(top["deadline"])
                url = _get_official_url(top, s_obj)

                message += f"**🏆 Recommended: {top['scholarship_name']}**\n\n"
                message += f"  🎯 Match Score: {top['match_percentage']}%\n"
                message += f"  💰 Funding: {_format_amt(top['amount'])} per annum\n"
                message += f"  {emoji} Deadline: {top['deadline']} ({urgency_label})\n\n"
                message += "  **Why recommended:**\n"

                satisfied = [r for r in top["reasons"] if r.startswith("✔")]
                for r in satisfied[:5]:
                    message += f"  {r}\n"
                message += "\n"

                # Ranking rationale
                message += "  **Ranking factors considered:**\n"
                message += f"  • Profile match score (40% weight): {top['match_percentage']}%\n"
                message += f"  • Funding value (30% weight): {_format_amt(top['amount'])}\n"
                message += f"  • Deadline urgency (30% weight): {urgency_label}\n\n"

                # Runners-up
                if len(eligible_matches) > 1:
                    message += "**Also eligible:**\n"
                    for m in eligible_matches[1:3]:
                        e2, ul2, _ = _get_deadline_urgency(m["deadline"])
                        message += f"  • {m['scholarship_name']} — Match: {m['match_percentage']}%, Funding: {_format_amt(m['amount'])}, {e2} Deadline: {m['deadline']}\n"
                    message += "\n"

                message += f"SOURCES & GROUNDING RULES:\n📖 {top['scholarship_name']} — {url}\n📖 Ranking based on ScholarAI eligibility engine. Data verified: {today_str}\n"
                message += "\n[View Eligible Scholarships →] [Upload Documents →]"
            else:
                message += "Based on your current profile, no fully eligible scholarships were found. Consider completing your profile and uploading required documents to unlock recommendations.\n\n"
                message += f"SOURCES & GROUNDING RULES:\n📖 ScholarAI Scholarship Database — https://scholarships.gov.in\n"
                message += "\n[Edit Profile →] [Upload Documents →]"

            return {"answer": message, "citations": [{"title": m["scholarship_name"], "id": m["id"]} for m in eligible_matches[:3]], "confidence": "HIGH"}

    # ─── INTENT 7: What should I do next / next steps ───────────────────────
    if any(p in q_lower for p in ["what should i do", "next steps", "action", "what next", "apply now"]):
        if db and user_id:
            from .matching_agent import ScholarshipMatchingAgent
            matches = ScholarshipMatchingAgent(db).match_scholarships(user_id)
            eligible_matches = sorted(
                [m for m in matches if m["status"] == "Eligible"],
                key=lambda m: _get_deadline_urgency(m["deadline"])[2]
            )
            docs = db.query(models.Document).filter(models.Document.user_id == user_id).all()
            uploaded_types = [d.document_type for d in docs]
            missing_docs = [d for d in ["aadhaar", "income", "community", "college", "tenth", "twelfth"] if d not in uploaded_types]

            message = "✔ Profile & eligibility checked\n\n"
            message += "**🎯 Recommended Next Steps:**\n\n"
            step = 1

            if eligible_matches:
                top = eligible_matches[0]
                emoji, urgency, _ = _get_deadline_urgency(top["deadline"])
                message += f"{step}. **Apply for {top['scholarship_name']}**\n"
                message += f"   {emoji} Deadline: {top['deadline']} — {urgency}\n\n"
                step += 1

            if missing_docs:
                message += f"{step}. **Upload missing documents** — {', '.join(d.title() for d in missing_docs)}\n\n"
                step += 1

            if len(eligible_matches) > 1:
                for m in eligible_matches[1:2]:
                    message += f"{step}. Apply for **{m['scholarship_name']}** (Deadline: {m['deadline']})\n\n"
                    step += 1

            message += f"{step}. Visit the official scholarship portal to submit applications.\n\n"
            message += f"SOURCES & GROUNDING RULES:\n📖 ScholarAI Eligibility Engine — Data verified: {today_str}\n"
            message += "\n[View Eligible Scholarships →] [Upload Documents →] [Edit Profile →]"
            return {"answer": message, "citations": [], "confidence": "HIGH"}

    # ─── Fallback: Intent-Classified Routing ───────────────────────────────
    intent = _classify_intent(user_query)

    # ── CURRENT AFFAIRS & LIVE INFORMATION INTENT ──
    if intent == "CURRENT_AFFAIRS":
        live_results = live_web_search(user_query, max_results=5)
        if live_results:
            live_context = "\n".join([f"• [{r['title']}]: {r['snippet']} (Source URL: {r['url']})" for r in live_results])
            current_prompt = f"""You are ScholarAI, an intelligent and grounded AI assistant for students.
The user is asking a time-sensitive / current affairs / government official / live information question.

TODAY'S VERIFIED DATE: {today_str}

LIVE SEARCH CONTEXT (RETRIEVED LIVE FROM OFFICIAL WEBSITES & TRUSTED SOURCES):
{live_context}

USER QUESTION:
{user_query}

CRITICAL ANTI-HALLUCINATION & LIVE VERIFICATION RULES:
1. For current office holders, government officials, district collectors, politicians, recruitment information, current deadlines, news, and other time-sensitive facts, NEVER rely solely on your pretrained knowledge.
2. The current holder of the office MUST be taken directly from the verified Live Search Context provided above (which contains snippets from official government domains like .nic.in / .gov.in).
3. Do NOT mention outdated previous officials as the current official.
4. If the live search context specifies a current official (e.g. from a district portal or gazette), state their name, title, and assumption date accurately.
5. If the live search context does NOT contain enough information to verify the current official, explicitly state that the current official could not be verified from available government records rather than guessing or giving an old answer.
6. Conclude with a clear "SOURCES:" section citing the official government URL(s) and "Data verified: {today_str}".

Answer:"""
            gemini_answer = call_gemini_api(current_prompt)
            if gemini_answer:
                if "SOURCES" not in gemini_answer.upper():
                    gemini_answer += f"\n\nSOURCES:\n"
                    for r in live_results[:2]:
                        gemini_answer += f"📖 {r['title']} — {r['url']}\n"
                    gemini_answer += f"📖 Data verified: {today_str}\n"
                return {
                    "answer": gemini_answer,
                    "citations": [{"title": r["title"], "url": r["url"]} for r in live_results],
                    "context_used": [r["title"] for r in live_results],
                    "confidence": "HIGH"
                }

        # Fallback when live info cannot be verified or Gemini is unavailable
        return {
            "answer": f"I can't verify the current information for \"{user_query}\" from official government records right now. My available information may be outdated.\n\nPlease check the official district administration website or government portal for live records.\n\n📖 Data verification attempted: {today_str}",
            "citations": [],
            "context_used": [],
            "confidence": "LOW"
        }

    # ── CASUAL INTENT → Gemini first, local fallback if unavailable ──
    if intent == "CASUAL":
        casual_prompt = f"""You are ScholarAI, a friendly and intelligent AI scholarship assistant for Indian students.
The user is having a casual conversation. Respond warmly and naturally, then gently guide them toward scholarship-related features.
Keep it brief (2-4 sentences max). Use emojis sparingly.

User says: {user_query}

Respond naturally:"""
        gemini_answer = call_gemini_api(casual_prompt)
        if gemini_answer:
            return {"answer": gemini_answer, "citations": [], "context_used": [], "confidence": "HIGH"}
        # Local fallback only if Gemini is down
        for key, resp in CASUAL_FALLBACK.items():
            if key in q_lower:
                return {"answer": resp, "citations": [], "context_used": [], "confidence": "HIGH"}
        return {"answer": "Hello! 👋 I'm ScholarAI — your AI scholarship advisor. Try asking about eligibility, deadlines, or documents!", "citations": [], "context_used": [], "confidence": "HIGH"}

    # ── GENERAL KNOWLEDGE or UNKNOWN → Gemini handles everything ──
    if intent in ("GENERAL_KNOWLEDGE", "UNKNOWN"):
        gen_prompt = f"""You are ScholarAI, a helpful AI assistant for students. You can answer any general question.
Answer clearly and concisely. If the topic relates to technology ScholarAI uses (Python, FastAPI, MySQL, React, Gemini, OCR), mention that briefly.
Do NOT make up facts. If unsure, say so honestly.

User asks: {user_query}

Answer:"""
        gemini_answer = call_gemini_api(gen_prompt)
        if gemini_answer:
            return {"answer": gemini_answer, "citations": [], "context_used": [], "confidence": "MEDIUM"}
        # Gemini unavailable — honest message
        return {
            "answer": ("I'm ScholarAI — your intelligent scholarship advisor! 🎓\n\n"
                       "I'm having trouble connecting to my AI engine right now, but I can still help with scholarship queries using my local database:\n\n"
                       "• ✔ \"Why am I eligible?\"\n"
                       "• ✔ \"Compare scholarships\"\n"
                       "• ✔ \"Deadline reminder\"\n"
                       "• ✔ \"Required documents\"\n"
                       "• ✔ \"Best scholarship for me\"\n"
                       "• ✔ \"What should I do next?\"\n\n"
                       "Try one of these scholarship-related questions!"),
            "citations": [], "context_used": [], "confidence": "LOW"
        }

    # ── SCHOLARSHIP INTENT → Full RAG pipeline ──
    context_docs = search_knowledge_base(user_query)
    citations = [{"title": d["title"], "id": d["id"]} for d in context_docs]
    context_str = "\n---\n".join([f"[{d['title']}]: {d['content'].strip()}" for d in context_docs])

    rag_prompt = f"""You are ScholarAI, an expert Scholarship and Higher Education Advisor AI.

STRICT ACCURACY RULES:
1. Ground your answer ONLY in the Knowledge Base, User Profile, and Scholarship System Data provided below.
2. Never invent scholarship amounts, deadlines, eligibility limits, or government policies not present in the context.
3. If any criterion cannot be verified, explicitly state: "Unable to verify this criterion from the available scholarship data."
4. Do NOT claim a student is definitely eligible based only on CGPA and income — check ALL stated mandatory criteria.
5. Always end with a SOURCES section citing official sources with real URLs (e.g., https://scholarships.gov.in).
6. Format clearly using bullet points, tables, or short sections.

[USER PROFILE]:
{user_profile_summary}

[SCHOLARSHIP DATABASE CONTEXT]:
{extra_context}

[KNOWLEDGE BASE]:
{context_str}

[USER QUESTION]:
{user_query}

Respond accurately and helpfully:"""

    gemini_answer = call_gemini_api(rag_prompt)
    if gemini_answer:
        answer = gemini_answer
        if "SOURCES" not in answer.upper():
            answer += "\n\nSOURCES & GROUNDING RULES:\n"
            for d in context_docs[:2]:
                url = d.get("url") or "https://scholarships.gov.in"
                answer += f"📖 {d['title']} — {url}\n"
            answer += f"📖 Data last verified: {today_str}\n"
    else:
        # Gemini unavailable — use local scholarship knowledge base
        answer = f"According to ScholarAI knowledge records:\n\n{context_docs[0]['content'].strip()}\n\n"
        url = context_docs[0].get("url") or "https://scholarships.gov.in"
        answer += f"SOURCES & GROUNDING RULES:\n📖 {context_docs[0]['title']} — {url}\n📖 Data last verified: {today_str}\n"

    return {
        "answer": answer,
        "citations": citations,
        "context_used": [d["title"] for d in context_docs],
        "confidence": "MEDIUM"
    }

