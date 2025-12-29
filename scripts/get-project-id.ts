import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
if (url) {
    // Format: https://[project-id].supabase.co
    const match = url.match(/https:\/\/([^.]+)\./)
    if (match) {
        console.log("Project ID:", match[1])
    } else {
        console.log("Could not parse Project ID from URL:", url)
    }
} else {
    console.log("NEXT_PUBLIC_SUPABASE_URL not found")
}
