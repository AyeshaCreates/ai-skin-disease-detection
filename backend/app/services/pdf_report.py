import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from PIL import Image

def generate_pdf_report(
    output_path: str,
    original_image_path: str,
    heatmap_image_path: str,
    disease: str,
    confidence: float,
    severity: str,
    symptoms: str,
    language: str,
    hospitals: list,
    recommendations: list
):
    """
    Generates a professional, clinical PDF report of the diagnosis.
    """
    # 1. Setup Document
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Paragraph Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        textColor=colors.HexColor('#1E3A8A'), # Navy blue
        spaceAfter=12,
        alignment=1 # Centered
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        textColor=colors.HexColor('#4B5563'), # Gray
        alignment=1,
        spaceAfter=20
    )
    
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=colors.HexColor('#0F766E'), # Teal
        spaceBefore=10,
        spaceAfter=8,
        borderColor=colors.HexColor('#E5E7EB'),
        borderWidth=1,
        borderRadius=2,
        borderPadding=4
    )
    
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#1F2937'),
        leading=14
    )
    
    bullet_style = ParagraphStyle(
        'BulletText',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )
    
    meta_label_style = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        textColor=colors.HexColor('#374151')
    )
    
    # 2. Compile Story
    story = []
    
    # Title & Header
    story.append(Paragraph("DERMASCAN AI SKIN ANALYSIS PLATFORM", title_style))
    story.append(Paragraph("AI-Assisted Assessment Report — Multi-Modal Intelligent Analysis", subtitle_style))
    story.append(Spacer(1, 10))
    
    # Metadata Block
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    meta_data = [
        [Paragraph("Report Timestamp:", meta_label_style), Paragraph(now_str, body_style),
         Paragraph("Symptom Language:", meta_label_style), Paragraph(language.upper(), body_style)],
        [Paragraph("Patient Symptoms:", meta_label_style), Paragraph(symptoms, body_style),
         Paragraph("System Model:", meta_label_style), Paragraph("EfficientNetB0 + MiniLM Fusion", body_style)]
    ]
    meta_table = Table(meta_data, colWidths=[1.5*inch, 2.0*inch, 1.5*inch, 2.0*inch])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))
    
    # Diagnosis Results Block
    story.append(Paragraph("Diagnostic Summary", section_heading))
    
    # Confidence text and coloring
    color_map = {
        "Mild": colors.HexColor('#10B981'),      # Green
        "Moderate": colors.HexColor('#F59E0B'),  # Orange
        "Severe": colors.HexColor('#EF4444')     # Red
    }
    sev_color = color_map.get(severity, colors.HexColor('#1E3A8A'))
    
    results_data = [
        [
            Paragraph("Detected Skin Condition", meta_label_style),
            Paragraph("System Confidence", meta_label_style),
            Paragraph("Clinical Severity", meta_label_style)
        ],
        [
            Paragraph(f"<b>{disease}</b>", ParagraphStyle('Dis', parent=body_style, fontSize=12, textColor=colors.HexColor('#1E3A8A'))),
            Paragraph(f"<b>{confidence * 100:.1f}%</b>", ParagraphStyle('Conf', parent=body_style, fontSize=12)),
            Paragraph(f"<b>{severity}</b>", ParagraphStyle('Sev', parent=body_style, fontSize=12, textColor=sev_color))
        ]
    ]
    
    results_table = Table(results_data, colWidths=[3.0*inch, 2.0*inch, 2.0*inch])
    results_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(results_table)
    story.append(Spacer(1, 15))
    
    # Images Section (Side by side)
    story.append(Paragraph("Visual Dermatological Analysis (Grad-CAM Heatmap)", section_heading))
    
    # Check if images exist, resize them and add to document
    image_row = []
    col_widths = []
    
    if os.path.exists(original_image_path):
        # Resize original image to square for report
        img_temp_orig = os.path.join(os.path.dirname(original_image_path), "report_temp_orig.jpg")
        with Image.open(original_image_path) as im:
            im.resize((200, 200)).save(img_temp_orig)
        image_row.append(RLImage(img_temp_orig, width=2.5*inch, height=2.5*inch))
        col_widths.append(3.2*inch)
        
    if os.path.exists(heatmap_image_path):
        # Resize heatmap image to square for report
        img_temp_heat = os.path.join(os.path.dirname(heatmap_image_path), "report_temp_heat.jpg")
        with Image.open(heatmap_image_path) as im:
            im.resize((200, 200)).save(img_temp_heat)
        image_row.append(RLImage(img_temp_heat, width=2.5*inch, height=2.5*inch))
        col_widths.append(3.2*inch)
        
    if image_row:
        image_table_data = [
            image_row,
            [Paragraph("<b>Original Lesion Photo</b>", body_style), Paragraph("<b>Grad-CAM Severity Overlay</b>", body_style)]
        ]
        image_table = Table(image_table_data, colWidths=col_widths)
        image_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,1), (-1,1), 5),
        ]))
        story.append(image_table)
        
    story.append(Spacer(1, 15))
    
    # Recommendations & Precautions
    story.append(Paragraph("Clinical Recommendations & Precautions", section_heading))
    for rec in recommendations:
        story.append(Paragraph(f"• {rec}", bullet_style))
        
    story.append(Spacer(1, 15))
    
    # Nearby Hospitals
    if hospitals:
        hospital_elements = []
        hospital_elements.append(Paragraph("Recommended Nearby Dermatology Centers", section_heading))
        
        hospital_table_data = [
            [Paragraph("<b>Hospital / Clinic Name</b>", meta_label_style),
             Paragraph("<b>Distance</b>", meta_label_style),
             Paragraph("<b>Contact No.</b>", meta_label_style)]
        ]
        
        for h in hospitals[:3]: # Add top 3 hospitals to report
            hospital_table_data.append([
                Paragraph(h["name"], body_style),
                Paragraph(h["distance"], body_style),
                Paragraph(h.get("phone", "N/A"), body_style)
            ])
            
        hospital_table = Table(hospital_table_data, colWidths=[4.0*inch, 1.2*inch, 1.8*inch])
        hospital_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 5),
        ]))
        hospital_elements.append(hospital_table)
        
        story.append(KeepTogether(hospital_elements))
        
    # Legal Disclaimer at the bottom
    story.append(Spacer(1, 20))
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Normal'],
        fontName='Helvetica-BoldOblique',
        fontSize=8,
        textColor=colors.HexColor('#9CA3AF'),
        alignment=1
    )
    story.append(Paragraph(
        "Disclaimer: This report is generated by a multi-modal AI classification system for educational and engineering purposes. "
        "It does not constitute official medical advice or a confirmed clinical diagnosis. Please consult a registered dermatologist for professional care.",
        disclaimer_style
    ))
    
    # Build Document
    doc.build(story)
    
    # Clean up temp files
    try:
        temp_orig = os.path.join(os.path.dirname(original_image_path), "report_temp_orig.jpg")
        temp_heat = os.path.join(os.path.dirname(heatmap_image_path), "report_temp_heat.jpg")
        if os.path.exists(temp_orig):
            os.remove(temp_orig)
        if os.path.exists(temp_heat):
            os.remove(temp_heat)
    except Exception as e:
        print(f"Error deleting temp files: {e}")
        
    return output_path
