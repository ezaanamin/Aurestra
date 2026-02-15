-- Delete all duplicates, keeping the record with the LOWEST ID
DELETE t1 FROM transactions t1
INNER JOIN transactions t2 
WHERE 
    t1.id > t2.id AND 
    t1.date = t2.date AND 
    t1.amount = t2.amount AND 
    t1.type = t2.type AND 
    t1.source = t2.source;
