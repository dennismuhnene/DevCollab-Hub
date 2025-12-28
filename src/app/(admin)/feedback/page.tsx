'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { questions } from '@/lib/questions';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

// Define the shape of the feedback data for type safety
interface FeedbackData {
  id: string;
  userId: string;
  url: string;
  createdAt: { seconds: number };
  answers: { [key: string]: string | number | boolean | string[] };
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      const feedbackCol = collection(db, 'feedback');
      const q = query(feedbackCol, orderBy('createdAt', 'desc'));
      const feedbackSnapshot = await getDocs(q);
      const feedbackList = feedbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FeedbackData[];
      setFeedback(feedbackList);
    };

    const prepareLogo = async () => {
        const response = await fetch('/images/devcollab-logo.png');
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        setLogoBase64(base64);
    }

    fetchFeedback();
    prepareLogo();
  }, []);

  const generatePdf = async (items: FeedbackData[]) => {
    if (!logoBase64) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const addHeader = (doc: jsPDF) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const logoWidth = 22;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(logoBase64, 'PNG', logoX, 8, logoWidth, logoWidth);
        doc.setFontSize(11);
        doc.setTextColor('#757575');
        doc.text('Find your Crew, build your vision.', pageWidth / 2, 36, { align: 'center' });
        doc.setDrawColor('#E0E0E0');
        doc.line(15, 40, pageWidth - 15, 40);
    };

    const addFooter = (doc: jsPDF) => {
        const pageCount = doc.internal.pages.length -1;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(9);
        doc.setTextColor('#757575');
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
    };

    items.forEach((f, index) => {
        if (index > 0) doc.addPage();

        const tableData = questions
            .map(q => {
                const answer = f.answers[q.id];
                if (answer === undefined) return null;
                const answerText = Array.isArray(answer) ? answer.join(', ') : String(answer);
                return [q.question, answerText];
            })
            .filter(row => row !== null) as string[][];

        doc.setFontSize(16);
        doc.setTextColor('#212121');
        doc.setFont('helvetica', 'bold');
        doc.text('Feedback Submission', 15, 55);

        doc.setFontSize(10);
        doc.setTextColor('#757575');
        doc.setFont('helvetica', 'normal');
        doc.text(`From: ${f.userId}`, 15, 62);
        doc.text(`Submitted: ${new Date(f.createdAt.seconds * 1000).toLocaleString()}`, 15, 67);
        doc.text(`URL: ${f.url}`, 15, 72);

        autoTable(doc, {
            startY: 80,
            head: [['Question', 'Answer']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: '#ffa100', textColor: '#FFFFFF', fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 80, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
            margin: { top: 45, left: 15, right: 15, bottom: 20 },
            didDrawPage: () => addHeader(doc),
        });
    });

    addFooter(doc);
    const fileName = items.length > 1 ? 'DevCollab-All-Feedback.pdf' : `DevCollab-Feedback-${items[0].userId}.pdf`;
    doc.save(fileName);
  };
  
  const handlePrevious = () => setCurrentIndex(prev => Math.max(prev - 1, 0));
  const handleNext = () => setCurrentIndex(prev => Math.min(prev + 1, feedback.length - 1));

  const currentFeedback = feedback.length > 0 ? feedback[currentIndex] : null;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
          <div className="flex flex-col items-center text-center mb-6 md:mb-8">
            <Image
              src="/images/devcollab-logo.png"
              alt="DevCollab Hub Logo"
              width={80}
              height={80}
              className="mb-2"
            />
            <p className="text-muted-foreground mb-4">Find your Crew, build your vision.</p>
            <h1 className="text-2xl sm:text-3xl font-bold">Feedback Submissions</h1>
            <p className="text-muted-foreground mt-2">Review and export user feedback.</p>
          </div>

          {currentFeedback ? (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                  <div className="flex items-center gap-4">
                      <Button onClick={handlePrevious} disabled={currentIndex === 0} variant="outline" size="icon">
                          <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="font-medium text-sm sm:text-base">
                          Submission {currentIndex + 1} of {feedback.length}
                      </span>
                      <Button onClick={handleNext} disabled={currentIndex === feedback.length - 1} variant="outline" size="icon">
                          <ChevronRight className="h-4 w-4" />
                      </Button>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4">
                      <Button onClick={() => generatePdf([currentFeedback])} variant="secondary" className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          <span>Report</span>
                      </Button>
                      <Button onClick={() => generatePdf(feedback)} variant="outline" className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        <span>Download All</span>
                      </Button>
                  </div>
              </div>

              <Card key={currentFeedback.id} className="bg-[#FFFFF0] shadow-lg w-full">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Feedback from {currentFeedback.userId}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Submitted on {new Date(currentFeedback.createdAt.seconds * 1000).toLocaleString()} from {currentFeedback.url}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold">Question</TableHead>
                        <TableHead className="font-bold">Answer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {questions.map((question) => {
                        const answer = currentFeedback.answers[question.id];
                        if (answer === undefined) return null;
                        const answerText = Array.isArray(answer) ? answer.join(', ') : String(answer);
                        return (
                          <TableRow key={question.id}>
                            <TableCell className="font-medium py-3 px-4">{question.question}</TableCell>
                            <TableCell className="py-3 px-4">{answerText}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-16">
              <p>No feedback submissions found.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
