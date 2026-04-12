#!/usr/bin/env python3
"""
Visual Feedback Hub - Supabase Data Query Tool
Supports both old and new schema structures

Usage:
  python supabase_query.py --list-projects
  python supabase_query.py --project-stats
  python supabase_query.py --comments <project_id>
  python supabase_query.py --project <project_id>
  python supabase_query.py --migrate  # Print migration SQL
"""

import json
import urllib.request
import urllib.parse
import argparse
from datetime import datetime

# Configuration - update these for your Supabase project
SUPABASE_URL = "https://bmmebxdeiidfoudlydsi.supabase.co"
SUPABASE_KEY = "sb_publishable_fJ8NMOelRZmhBgNMdg04KA_lcdknlEg"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "count=exact"
}

def supabase_get(table: str, params: dict = None) -> tuple:
    """Query Supabase REST API, returns (data, total_count)"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if params:
        # Handle special operators
        query_params = []
        for key, value in params.items():
            if isinstance(value, str) and '.eq.' in value:
                query_params.append(f"{key}={urllib.parse.quote(value)}")
            elif value is not None:
                query_params.append(f"{key}={urllib.parse.quote(str(value))}")
        if query_params:
            url += "?" + "&".join(query_params)
    
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        total = response.headers.get('Content-Range', '').split('/')[-1] if 'Content-Range' in response.headers else len(data)
        return data, int(total) if total.isdigit() else len(data)

def format_datetime(dt_str: str) -> str:
    """Format ISO datetime to readable string"""
    try:
        dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        return dt.strftime("%Y-%m-%d %H:%M")
    except:
        return dt_str[:16] if dt_str else "N/A"

def list_projects(limit: int = 20):
    """List all projects with stats"""
    projects, total = supabase_get("projects", {
        "select": "id,title,owner_id,asset_type,asset_url,created_at,updated_at",
        "limit": str(limit),
        "order": "created_at.desc"
    })
    
    print(f"\n{'='*70}")
    print(f"📁 Projects (Total: {total})")
    print(f"{'='*70}")
    
    for i, p in enumerate(projects, 1):
        # Count comments for this project
        try:
            comments, comment_count = supabase_get("comments", {
                "select": "id",
                f"project_id.eq.{p['id']}": "true",
            })
        except:
            comment_count = "?"
        
        asset_icon = "🖼️" if p.get('asset_type') == 'image' else "📄" if p.get('asset_type') == 'pdf' else "📸"
        print(f"{i:2}. {asset_icon} {p.get('title', 'Untitled')}")
        print(f"    ID: {p['id']}")
        print(f"    Type: {p.get('asset_type', 'N/A')} | Owner: {p.get('owner_id', 'N/A')}")
        print(f"    Comments: {comment_count} | Created: {format_datetime(p.get('created_at', ''))}")
        if p.get('asset_url'):
            url_preview = p['asset_url'][:50] + "..." if len(p.get('asset_url', '')) > 50 else p.get('asset_url', '')
            print(f"    URL: {url_preview}")
        print()
    return projects

def get_project(project_id: str):
    """Get single project with all details"""
    projects, _ = supabase_get("projects", {
        "id": f"eq.{project_id}",
        "select": "*"
    })
    
    if not projects:
        print(f"❌ Project not found: {project_id}")
        return None
    
    p = projects[0]
    comments, comment_count = supabase_get("comments", {
        "select": "*",
        f"project_id.eq.{project_id}": "true",
        "order": "display_order.asc"
    })
    
    print(f"\n{'='*70}")
    print(f"📋 Project: {p.get('title', 'Untitled')}")
    print(f"{'='*70}")
    print(f"ID:        {p['id']}")
    print(f"Type:      {p.get('asset_type', 'N/A')}")
    print(f"Owner:     {p.get('owner_id', 'N/A')}")
    print(f"Created:   {format_datetime(p.get('created_at', ''))}")
    print(f"Updated:   {format_datetime(p.get('updated_at', ''))}")
    print(f"Comments:  {comment_count}")
    if p.get('asset_url'):
        print(f"Asset URL: {p['asset_url']}")
    print()
    
    return p, comments

def list_comments(project_id: str, limit: int = 100):
    """List comments for a project"""
    project, _ = supabase_get("projects", {"id": f"eq.{project_id}"})
    project_title = project[0].get('title', 'Unknown') if project else 'Unknown'
    
    comments, total = supabase_get("comments", {
        "select": "*",
        f"project_id.eq.{project_id}": "true",
        "limit": str(limit),
        "order": "display_order.asc"
    })
    
    print(f"\n{'='*70}")
    print(f"💬 Comments for: {project_title}")
    print(f"{'='*70}")
    print(f"Total: {total}")
    print()
    
    # Stats by status and shape
    stats = {"pending": 0, "fixed": 0, "approved": 0}
    shapes = {}
    
    for c in comments:
        status = c.get('status', 'pending')
        shape = c.get('shape_type', 'pin')
        stats[status] = stats.get(status, 0) + 1
        shapes[shape] = shapes.get(shape, 0) + 1
    
    print(f"By Status: pending={stats.get('pending',0)}, fixed={stats.get('fixed',0)}, approved={stats.get('approved',0)}")
    print(f"By Shape: {', '.join(f'{k}={v}' for k,v in shapes.items())}")
    print()
    print("-" * 70)
    
    for c in comments:
        status_icon = "✅" if c.get('status') == 'fixed' else "⚠️" if c.get('status') == 'approved' else "⏳"
        shape_icon = {
            'pin': '📍', 'pen': '✏️', 'arrow': '➡️', 
            'rectangle': '⬜', 'highlight': '🖍️', 'text': '📝'
        }.get(c.get('shape_type', 'pin'), '📍')
        
        order = c.get('display_order', '?')
        content = c.get('content', '')[:60] + "..." if len(c.get('content', '')) > 60 else c.get('content', '')
        
        print(f"{status_icon} {shape_icon} #{order}: {content}")
        print(f"   Author: {c.get('author_name', 'Unknown')} | Color: {c.get('color', '#2563eb')}")
        print(f"   Pos: ({c.get('x', 0):.1f}, {c.get('y', 0):.1f})")
        if c.get('width') and c.get('height'):
            print(f"   Size: {c.get('width'):.0f} x {c.get('height'):.0f}")
        if c.get('page'):
            print(f"   Page: {c.get('page')}")
        print()
    
    print("=" * 70)
    return comments

def get_stats():
    """Get overall statistics"""
    projects, project_count = supabase_get("projects", {"select": "id"})
    comments, comment_count = supabase_get("comments", {"select": "id,status,shape_type"})
    
    # Count by status
    stats = {"pending": 0, "fixed": 0, "approved": 0}
    shapes = {}
    
    for c in comments:
        status = c.get('status', 'pending')
        shape = c.get('shape_type', 'pin')
        
        stats[status] = stats.get(status, 0) + 1
        shapes[shape] = shapes.get(shape, 0) + 1
    
    print(f"\n{'='*70}")
    print(f"📊 Visual Feedback Hub - Statistics")
    print(f"{'='*70}")
    print(f"📁 Projects: {project_count}")
    print(f"💬 Comments: {comment_count}")
    print()
    print(f"By Status:")
    print(f"   ⏳ Pending:  {stats.get('pending', 0)}")
    print(f"   ✅ Fixed:    {stats.get('fixed', 0)}")
    print(f"   ⚠️  Approved: {stats.get('approved', 0)}")
    print()
    print(f"By Shape Type:")
    for shape, count in sorted(shapes.items(), key=lambda x: -x[1]):
        icon = {'pin': '📍', 'pen': '✏️', 'arrow': '➡️', 'rectangle': '⬜', 'highlight': '🖍️', 'text': '📝'}.get(shape, '📍')
        print(f"   {icon} {shape}: {count}")
    print(f"{'='*70}\n")
    
    return {
        "projects": project_count, 
        "comments": comment_count, 
        "status": stats, 
        "shapes": shapes
    }

def show_migration():
    """Print the migration SQL that needs to be run"""
    migration = '''-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- Adds missing columns for Text tool and proper ordering

ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS display_order int DEFAULT 0;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#2563eb';
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS path_points jsonb;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS text_content text;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS font_size int DEFAULT 16;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'Inter';
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS font_weight int DEFAULT 400;

-- Update shape_type constraint to include 'text'
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_shape_type_check;
ALTER TABLE public.comments ADD CONSTRAINT comments_shape_type_check 
CHECK (shape_type IN ('pin', 'pen', 'arrow', 'rectangle', 'highlight', 'text'));

-- Backfill display_order
UPDATE public.comments SET display_order = subquery.row_num
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num FROM public.comments) AS subquery
WHERE public.comments.id = subquery.id;

-- Auto-set display_order on new inserts
CREATE OR REPLACE FUNCTION set_display_order() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_order IS NULL OR NEW.display_order = 0 THEN
    SELECT COALESCE(MAX(display_order), 0) + 1 INTO NEW.display_order 
    FROM public.comments WHERE project_id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_display_order_trigger ON public.comments;
CREATE TRIGGER set_display_order_trigger BEFORE INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION set_display_order();
'''
    print(migration)

def main():
    parser = argparse.ArgumentParser(description="Visual Feedback Hub - Data Query Tool")
    parser.add_argument("--list-projects", action="store_true", help="List all projects")
    parser.add_argument("--project-stats", action="store_true", help="Get overall statistics")
    parser.add_argument("--project", metavar="ID", help="Get single project details")
    parser.add_argument("--comments", metavar="PROJECT_ID", help="List comments for a project")
    parser.add_argument("--migrate", action="store_true", help="Print migration SQL")
    parser.add_argument("--limit", type=int, default=20, help="Limit results (default: 20)")
    
    args = parser.parse_args()
    
    if args.migrate:
        show_migration()
    elif args.list_projects:
        list_projects(args.limit)
    elif args.project:
        get_project(args.project)
    elif args.project_stats:
        get_stats()
    elif args.comments:
        list_comments(args.comments, args.limit)
    else:
        parser.print_help()
        print("\nExamples:")
        print("  python supabase_query.py --project-stats")
        print("  python supabase_query.py --list-projects --limit 10")
        print("  python supabase_query.py --comments <project_id>")
        print("  python supabase_query.py --migrate  # Run in Supabase SQL Editor")

if __name__ == "__main__":
    main()
