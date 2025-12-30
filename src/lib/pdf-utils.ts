import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface GeneratePDFOptions {
    workout: any
    client?: any
}

export function generateWorkoutPDF({ workout, client }: GeneratePDFOptions) {
    const doc = new jsPDF()

    const exercises = Array.isArray(workout.structure) ? workout.structure : []
    const scheduledDays = client && workout.scheduled_days && workout.scheduled_days.length > 0
        ? workout.scheduled_days.join(" | ")
        : null

    // Header
    doc.setFontSize(18)
    doc.text(`Rutina: ${workout.name}`, 14, 20)

    doc.setFontSize(12)
    if (client) {
        doc.text(`Cliente: ${client.full_name || 'N/A'}`, 14, 30)
        if (scheduledDays) doc.text(`Días: ${scheduledDays}`, 14, 36)
    }

    // Prepare table data
    const tableBody: any[] = []

    exercises.forEach((ex: any) => {
        // Title row for exercise
        tableBody.push([{ content: ex.name, colSpan: 5, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }])

        const setsDetail = ex.sets_detail || []
        if (setsDetail.length > 0) {
            setsDetail.forEach((set: any, idx: number) => {
                tableBody.push([
                    `Set ${idx + 1}`,
                    `${set.reps}`,
                    `${set.weight}kg`,
                    `${set.rest}s`,
                    ''
                ])
            })
        } else {
            tableBody.push([
                'Series Generales',
                `${ex.reps}`,
                '-',
                '-',
                `${ex.sets} series`
            ])
        }
    })

    autoTable(doc, {
        startY: client ? 45 : 35,
        head: [['Detalle', 'Repes', 'Peso', 'Descanso', 'Notas']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [14, 14, 14] } // Primary Black
    })

    // Add notes if they exist
    if (workout.notes && workout.notes.trim() !== "") {
        const finalY = (doc as any).lastAutoTable.finalY || 45
        doc.text("Notas generales:", 14, finalY + 10)
        doc.setFontSize(10)
        doc.text(workout.notes, 14, finalY + 16, { maxWidth: 180 })
    }

    doc.save(`Rutina_${workout.name.replace(/\\s+/g, '_')}.pdf`)
}
