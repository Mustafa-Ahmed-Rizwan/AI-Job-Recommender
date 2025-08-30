# backensrc/job_api.py
import os
from dotenv import load_dotenv
from serpapi import GoogleSearch

load_dotenv()

SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")
if not SERPAPI_API_KEY:
    raise ValueError("Please set SERPAPI_API_KEY in environment")


def fetch_jobs(search_query: str, location: str = "Pakistan", num_results: int = 20):
    """
    Fetch job listings from Google Jobs (includes LinkedIn, Indeed, Glassdoor, etc.)
    using SerpApi.
    """
    params = {
        "engine": "google_jobs",
        "q": f"{search_query} in {location}",
        "hl": "en",
        "api_key": SERPAPI_API_KEY,
    }

    search = GoogleSearch(params)
    try:
        results = search.get_dict()
        if results and isinstance(results, dict):
            jobs = results.get("jobs_results", [])
            
            # Process jobs to extract apply links and avoid duplicates
            processed_jobs = []
            seen_jobs = set()

            for i, job in enumerate(jobs):
                print(f"\n=== DEBUG Job {i+1} (raw) ===")
                # Print raw keys so we can detect unexpected field names
                try:
                    print("Raw job keys:", list(job.keys()))
                except Exception:
                    print("Raw job (non-dict?)", job)

                # Normalize common fields
                title = job.get('title') or job.get('job_title') or job.get('position') or ""
                company_name = job.get('company_name') or job.get('company') or job.get('via') or ""
                location_field = job.get('location') or job.get('place') or ""
                description = job.get('description') or job.get('snippet') or job.get('summary') or ""

                # Ensure keys exist so downstream code sees consistent schema
                job['title'] = title
                job['company_name'] = company_name
                job['location'] = location_field
                job['description'] = description

                print(f"Title: {title}")
                print(f"Company: {company_name}")

                # Debug apply_options structure
                apply_options = job.get('apply_options')
                print(f"Apply options type: {type(apply_options)}")
                print(f"Apply options: {apply_options}")

                # Debug share_link
                share_link = job.get('share_link')
                print(f"Share link: {share_link}")

                # Create unique identifier (normalize to avoid duplicates)
                job_key = (
                    title.lower().strip() if title else "",
                    company_name.lower().strip() if company_name else "",
                    location_field.lower().strip() if location_field else ""
                )

                # Skip duplicates
                if job_key in seen_jobs:
                    print("SKIPPED: Duplicate job")
                    continue
                seen_jobs.add(job_key)

                # Extract apply link robustly
                apply_link = ""
                if isinstance(apply_options, list):
                    for option in apply_options:
                        print(f"Processing apply option: {option}")
                        if isinstance(option, dict) and option.get('link'):
                            apply_link = option.get('link')
                            print(f"Found apply link (from apply_options): {apply_link}")
                            break
                        # handle simple tuple/list entry
                        if isinstance(option, (list, tuple)) and len(option) >= 2:
                            if option[1] and isinstance(option[1], str) and option[1].startswith("http"):
                                apply_link = option[1]
                                print(f"Found apply link (from apply_options tuple): {apply_link}")
                                break

                # Fallbacks
                if not apply_link and share_link:
                    apply_link = share_link
                    print(f"Using share_link as fallback: {apply_link}")

                # Last resort: look for any URL-like string in job fields
                if not apply_link:
                    for k in ('link', 'url', 'apply_url'):
                        v = job.get(k)
                        if isinstance(v, str) and v.startswith("http"):
                            apply_link = v
                            print(f"Found apply link (from '{k}'): {apply_link}")
                            break

                # Store normalized apply_link key
                job['apply_link'] = apply_link or ""

                print(f"Final apply_link: {job['apply_link']}")

                processed_jobs.append(job)

                # Stop when we have enough unique jobs
                if len(processed_jobs) >= num_results:
                    break

            print(f"\n=== SUMMARY ===")
            print(f"Total jobs processed: {len(processed_jobs)}")
            for i, job in enumerate(processed_jobs):
                print(f"Job {i+1}: {job.get('title')} - Apply link: {job.get('apply_link', 'None')}")
            
            return processed_jobs
        else:
            print(f"Unexpected response type: {type(results)}")
            print(f"Response content: {results}")
        return []
    except Exception as e:
        print(f"Error getting search results: {e}")
        return []

    


# Example usage
if __name__ == "__main__":
    jobs = fetch_jobs("Software Engineer", "Pakistan", num_results=10)
    for job in jobs:
        print(f"{job.get('title')} at {job.get('company_name')} - {job.get('location')}")
        print(f"Apply link: {job.get('apply_link')}")
        print("-" * 50)