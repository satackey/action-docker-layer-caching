FROM alpine AS data
RUN date > /now1.txt
RUN date > /now2.txt
RUN date > /now3.txt
RUN date > /now4.txt
RUN date > /now5.txt
RUN date > /now6.txt
RUN date > /now7.txt
RUN date > /now8.txt
RUN date > /now9.txt
RUN date > /now10.txt
RUN date > /now11.txt
RUN date > /now12.txt
RUN date > /now13.txt
RUN date > /now14.txt
RUN date > /now15.txt
RUN date > /now16.txt

FROM scratch
COPY --from=data /now16.txt /data_stage_built_at.txt
